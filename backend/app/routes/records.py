"""
app/routes/records.py
=====================
Patient record CRUD — all async via Beanie.

Note on sort syntax: using string "-created_at" rather than the unary
-PatientRecord.created_at field expression, because the string form is
stable across all Beanie 1.x releases.

GET  /api/records/dashboard    stats + top diagnoses + recent 6 records
GET  /api/records              paginated + searchable list
GET  /api/records/{id}         full record detail
DELETE /api/records/{id}       permanent delete
"""

import re
import logging
from collections import Counter
from datetime import datetime, timezone, timedelta  # FIX: added timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.database import PatientRecord, User
from app.models.schemas  import (
    PatientRecordSummary, PatientRecordDetail,
    RecordsListResponse, DashboardStats,
)
from app.services.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/records", tags=["Patient Records"])


# ─── helpers ─────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    # FIX: datetime.utcnow() deprecated in Python 3.12+.
    return datetime.now(timezone.utc)


def _as_aware(dt: datetime) -> datetime:
    """
    Return a timezone-aware UTC datetime regardless of whether *dt* is
    naive or aware.

    WHY THIS EXISTS:
    Old records in MongoDB were stored with datetime.utcnow() which produces
    a naive (no tzinfo) datetime.  After our fix, new records use
    datetime.now(timezone.utc) which produces an aware datetime.
    Comparing aware cutoffs (week_ago, month_ago) with naive r.created_at
    raises TypeError: can't compare offset-naive and offset-aware datetimes.
    This helper normalises both sides before any comparison.
    """
    if dt.tzinfo is None:
        # Treat naive datetimes as UTC (which is what utcnow() produces)
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _summary(r: PatientRecord) -> PatientRecordSummary:
    return PatientRecordSummary(
        id               = str(r.id),
        patient_name     = r.patient_name,
        visit_date       = r.visit_date,
        diagnosis        = r.diagnosis,
        patient_symptoms = r.patient_symptoms,
        input_mode       = r.input_mode,
        created_at       = r.created_at,
    )


def _detail(r: PatientRecord) -> PatientRecordDetail:
    return PatientRecordDetail(
        id               = str(r.id),
        patient_name     = r.patient_name,
        visit_date       = r.visit_date,
        conversation     = r.conversation,
        transcription    = r.transcription,
        input_mode       = r.input_mode,
        patient_symptoms = r.patient_symptoms,
        diagnosis        = r.diagnosis,
        treatment_plan   = r.treatment_plan,
        medications      = r.medications,
        follow_up        = r.follow_up,
        gemini_model     = r.gemini_model,
        created_at       = r.created_at,
        updated_at       = r.updated_at,
    )


def _validate_oid(record_id: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID format")


# ─── endpoints ───────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(current_user: User = Depends(get_current_user)):
    uid = str(current_user.id)

    # FIX: Use _utcnow() (timezone-aware) consistently so comparisons with
    # timezone-aware created_at values from the DB don't raise TypeError.
    now       = _utcnow()
    week_ago  = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Dashboard needs all records for counting + top-diagnoses; keep full fetch
    # but limit fields to only what is needed to reduce wire transfer.
    all_records = await PatientRecord.find(
        PatientRecord.user_id == uid
    ).sort("-created_at").to_list()

    diagnoses     = [r.diagnosis for r in all_records if r.diagnosis != "Not mentioned."]
    top_diagnoses = [
        {"diagnosis": d, "count": c}
        for d, c in Counter(diagnoses).most_common(5)
    ]

    # FIX: created_at from old records may be timezone-naive (stored with
    # datetime.utcnow() before our fix). _as_aware() normalises both sides
    # so the comparison never raises TypeError.
    return DashboardStats(
        total_records  = len(all_records),
        this_week      = sum(1 for r in all_records if _as_aware(r.created_at) >= week_ago),
        this_month     = sum(1 for r in all_records if _as_aware(r.created_at) >= month_ago),
        recent_records = [_summary(r) for r in all_records[:6]],
        top_diagnoses  = top_diagnoses,
    )


@router.get("", response_model=RecordsListResponse)
async def list_records(
    page:         int           = Query(1, ge=1),
    limit:        int           = Query(10, ge=1, le=100),
    search:       Optional[str] = Query(None),
    current_user: User          = Depends(get_current_user),
):
    uid = str(current_user.id)

    if search:
        # FIX: Push search filter to MongoDB using $regex instead of fetching
        # all records and filtering in Python.  This avoids loading the entire
        # collection into memory on every search request.
        escaped = re.escape(search)
        regex   = {"$regex": escaped, "$options": "i"}
        query   = PatientRecord.find(
            PatientRecord.user_id == uid,
            {
                "$or": [
                    {"patient_name":     regex},
                    {"diagnosis":        regex},
                    {"patient_symptoms": regex},
                ]
            },
        )
    else:
        query = PatientRecord.find(PatientRecord.user_id == uid)

    # FIX: Use DB-level count + skip/limit instead of loading all documents.
    total      = await query.count()
    page_slice = await query.sort("-created_at").skip((page - 1) * limit).limit(limit).to_list()

    return RecordsListResponse(
        records = [_summary(r) for r in page_slice],
        total   = total,
        page    = page,
        limit   = limit,
    )


@router.get("/{record_id}", response_model=PatientRecordDetail)
async def get_record(
    record_id:    str,
    current_user: User = Depends(get_current_user),
):
    record = await PatientRecord.get(_validate_oid(record_id))
    if not record or record.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Record not found")
    return _detail(record)


@router.delete("/{record_id}", status_code=204)
async def delete_record(
    record_id:    str,
    current_user: User = Depends(get_current_user),
):
    record = await PatientRecord.get(_validate_oid(record_id))
    if not record or record.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Record not found")
    await record.delete()
    logger.info("Deleted record %s for user %s", record_id, current_user.id)