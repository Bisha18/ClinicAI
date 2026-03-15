"""
app/models/schemas.py
=====================
Pydantic request / response schemas for all API endpoints.

These are kept separate from the Beanie Document models in database.py.
  • Document models  → MongoDB persistence layer
  • Schemas          → API input validation + response serialisation

Sections
--------
  Auth     →  signup, login, token response, user profile
  Notes    →  conversation input, structured AI output
  Records  →  list summary, full detail, dashboard stats
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


# =============================================================================
# Auth Schemas
# =============================================================================

class SignupRequest(BaseModel):
    email:     EmailStr
    full_name: str            = Field(..., min_length=2, max_length=100)
    password:  str            = Field(..., min_length=8,
                                       description="Minimum 8 characters")
    specialty: Optional[str] = Field(None,
                                      description="e.g. Cardiology, General Practice")


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class UserProfile(BaseModel):
    id:         str
    email:      str
    full_name:  str
    specialty:  Optional[str]
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserProfile


# =============================================================================
# Clinical Note Schemas
# =============================================================================

class ConversationRequest(BaseModel):
    """Request body for POST /api/notes/generate."""
    conversation: str            = Field(..., min_length=20,
                                          description="Raw doctor-patient conversation text")
    patient_name: Optional[str] = None
    visit_date:   Optional[str] = None


class ClinicalNote(BaseModel):
    """Structured output extracted by the Gemini AI pipeline."""
    patient_symptoms: str
    diagnosis:        str
    treatment_plan:   str
    medications:      str
    follow_up:        str


class GenerateNotesResponse(BaseModel):
    success:       bool                    = True
    clinical_note: Optional[ClinicalNote] = None
    raw_text:      str                    = ""
    patient_name:  Optional[str]          = None
    visit_date:    Optional[str]          = None
    transcription: Optional[str]          = None
    record_id:     Optional[str]          = None   # MongoDB ObjectId of saved record
    error:         Optional[str]          = None


class TranscriptionResponse(BaseModel):
    success:       bool          = True
    transcription: Optional[str] = None
    error:         Optional[str] = None


# =============================================================================
# Patient Record Schemas
# =============================================================================

class PatientRecordSummary(BaseModel):
    """Compact representation used in list views and the dashboard."""
    id:               str
    patient_name:     Optional[str]
    visit_date:       Optional[str]
    diagnosis:        str
    patient_symptoms: str
    input_mode:       str
    created_at:       datetime


class PatientRecordDetail(BaseModel):
    """Full record returned by GET /api/records/{id}."""
    id:               str
    patient_name:     Optional[str]
    visit_date:       Optional[str]
    conversation:     str
    transcription:    Optional[str]
    input_mode:       str
    patient_symptoms: str
    diagnosis:        str
    treatment_plan:   str
    medications:      str
    follow_up:        str
    gemini_model:     Optional[str]
    created_at:       datetime
    updated_at:       datetime


class RecordsListResponse(BaseModel):
    records: List[PatientRecordSummary]
    total:   int
    page:    int
    limit:   int


class DashboardStats(BaseModel):
    total_records:  int
    this_week:      int
    this_month:     int
    recent_records: List[PatientRecordSummary]
    top_diagnoses:  List[dict]