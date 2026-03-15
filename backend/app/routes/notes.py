"""
app/routes/notes.py
===================
Clinical note generation — auth-protected, saves to MongoDB.

POST /api/notes/generate          text → AI note → saved
POST /api/notes/generate/audio    audio → transcribe → AI note → saved
POST /api/notes/transcribe        audio → transcript only (not saved)
GET  /api/notes/search            semantic vector search
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends

from app.models.schemas       import ConversationRequest, GenerateNotesResponse, TranscriptionResponse
from app.models.database      import PatientRecord, User
from app.services.ai_pipeline   import generate_clinical_notes
from app.services.transcription import transcribe_audio
from app.services.vector_store  import note_store
from app.services.auth          import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notes", tags=["Clinical Notes"])

ALLOWED_AUDIO = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav",
    "audio/mp4", "audio/m4a", "audio/webm", "video/webm",
    "audio/ogg", "audio/flac", "audio/aiff",
}


async def _save(user_id: str, conversation: str, note, patient_name,
                visit_date, input_mode="text", transcription=None) -> PatientRecord:
    record = PatientRecord(
        user_id          = user_id,
        patient_name     = patient_name,
        visit_date       = visit_date,
        conversation     = conversation,
        input_mode       = input_mode,
        transcription    = transcription,
        patient_symptoms = note.patient_symptoms,
        diagnosis        = note.diagnosis,
        treatment_plan   = note.treatment_plan,
        medications      = note.medications,
        follow_up        = note.follow_up,
        gemini_model     = os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
    )
    await record.insert()
    return record


@router.post("/generate", response_model=GenerateNotesResponse)
async def generate_from_text(
    request:      ConversationRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        note, raw = await generate_clinical_notes(
            conversation = request.conversation,
            patient_name = request.patient_name,
            visit_date   = request.visit_date,
        )
        record = await _save(str(current_user.id), request.conversation,
                             note, request.patient_name, request.visit_date)
        try:
            note_store.add_note(note, str(record.id), request.patient_name, request.visit_date)
        except Exception as e:
            logger.warning("Vector store write failed (non-critical): %s", e)

        return GenerateNotesResponse(
            success=True, clinical_note=note, raw_text=raw,
            patient_name=request.patient_name, visit_date=request.visit_date,
            record_id=str(record.id),
        )
    except Exception as e:
        logger.exception("Note generation error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/audio", response_model=GenerateNotesResponse)
async def generate_from_audio(
    audio_file:   UploadFile        = File(...),
    patient_name: Optional[str]     = Form(None),
    visit_date:   Optional[str]     = Form(None),
    current_user: User              = Depends(get_current_user),
):
    # FIX: content_type can be None when the client omits the Content-Type header.
    # The original `audio_file.content_type not in ALLOWED_AUDIO` silently passes
    # None through (None is simply not in the set, so no 415 is raised).
    # Explicitly reject missing or unsupported types.
    if not audio_file.content_type or audio_file.content_type not in ALLOWED_AUDIO:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported or missing audio content type: {audio_file.content_type!r}. "
                   f"Allowed: {', '.join(sorted(ALLOWED_AUDIO))}",
        )

    data = await audio_file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 20 MB.")

    try:
        transcript = await transcribe_audio(data, audio_file.filename or "upload.mp3")
        if not transcript or len(transcript.strip()) < 20:
            raise HTTPException(status_code=422, detail="Transcription too short or empty.")

        note, raw = await generate_clinical_notes(
            conversation=transcript, patient_name=patient_name, visit_date=visit_date)
        record = await _save(str(current_user.id), transcript, note,
                             patient_name, visit_date,
                             input_mode="audio", transcription=transcript)

        return GenerateNotesResponse(
            success=True, clinical_note=note, raw_text=raw,
            transcription=transcript, patient_name=patient_name,
            visit_date=visit_date, record_id=str(record.id),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Audio processing error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_only(
    audio_file:   UploadFile = File(...),
    current_user: User       = Depends(get_current_user),
):
    data = await audio_file.read()
    try:
        t = await transcribe_audio(data, audio_file.filename or "upload.mp3")
        return TranscriptionResponse(success=True, transcription=t)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_notes(
    query:        str  = Query(..., min_length=3),
    k:            int  = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
):
    try:
        return {"success": True, "results": note_store.search(query, k=k)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))