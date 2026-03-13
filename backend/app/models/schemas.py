"""
models/schemas.py
=================
Pydantic data models that define the shape of:
  - API request bodies
  - API response bodies
  - Internal data passed between service layers

Pydantic automatically validates incoming JSON and raises
clear HTTP 422 errors when data doesn't match the schema.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class InputMode(str, Enum):
    """How the user provides the conversation."""
    TEXT  = "text"   # User pastes raw text
    AUDIO = "audio"  # User uploads audio file (transcribed by Whisper)


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class ConversationRequest(BaseModel):
    """
    Request body for POST /generate-notes (text mode).

    Fields
    ------
    conversation : str
        The raw doctor-patient dialogue as plain text.
    patient_name : str | None
        Optional patient identifier for the note header.
    visit_date : str | None
        Optional visit date string (e.g. "2025-01-15").
    """
    conversation: str = Field(
        ...,
        min_length=20,
        description="Full doctor-patient conversation text",
        example=(
            "Doctor: Good morning. What brings you in today?\n"
            "Patient: I've had a persistent cough for two weeks, "
            "some fever, and chest tightness.\n"
            "Doctor: Any shortness of breath? Did you measure the fever?\n"
            "Patient: Yes, around 38.5°C. Breathing feels a bit labored.\n"
            "Doctor: I'll prescribe amoxicillin 500mg twice daily for 7 days "
            "and suggest a chest X-ray. Come back in two weeks."
        ),
    )
    patient_name: Optional[str] = Field(None, description="Patient's name (optional)")
    visit_date:   Optional[str] = Field(None, description="Date of visit (optional)")


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------

class ClinicalNote(BaseModel):
    """
    Structured clinical note extracted by the AI.

    Every field maps to a standard section in a medical SOAP note
    (Subjective, Objective, Assessment, Plan).
    """
    patient_symptoms: str   = Field(..., description="Reported symptoms / chief complaint")
    diagnosis:        str   = Field(..., description="Probable or confirmed diagnosis")
    treatment_plan:   str   = Field(..., description="Recommended treatment and procedures")
    medications:      str   = Field(..., description="Prescribed medications, dosage, frequency")
    follow_up:        str   = Field(..., description="Follow-up instructions and timeline")


class GenerateNotesResponse(BaseModel):
    """
    Full API response returned from POST /generate-notes.

    Fields
    ------
    success : bool
        True if notes were generated without errors.
    clinical_note : ClinicalNote | None
        The structured note (None only when success=False).
    raw_text : str
        The verbatim LLM output before parsing — useful for debugging.
    patient_name : str | None
        Echo back the patient name if provided.
    visit_date : str | None
        Echo back the visit date if provided.
    transcription : str | None
        The Whisper transcription (only present for audio uploads).
    error : str | None
        Error message when success=False.
    """
    success:       bool              = True
    clinical_note: Optional[ClinicalNote] = None
    raw_text:      str               = ""
    patient_name:  Optional[str]     = None
    visit_date:    Optional[str]     = None
    transcription: Optional[str]     = None
    error:         Optional[str]     = None


class TranscriptionResponse(BaseModel):
    """Response from POST /transcribe — standalone audio-to-text endpoint."""
    success:       bool          = True
    transcription: Optional[str] = None
    error:         Optional[str] = None