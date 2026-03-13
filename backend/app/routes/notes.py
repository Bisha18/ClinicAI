"""
routes/notes.py
===============
FastAPI route handlers (controllers) for the clinical notes API.

Endpoints
---------
POST /api/generate-notes      → Generate notes from pasted text
POST /api/generate-notes/audio → Generate notes from uploaded audio file
POST /api/transcribe           → Audio-only transcription (no note generation)
GET  /api/search-notes         → Semantic search over stored notes

Why separate routes from services?
    Routes handle HTTP concerns (parsing request, returning HTTP responses,
    error codes). Services contain the actual business logic. This separation
    makes both easier to test and maintain.
"""

import uuid
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from typing import Optional

from app.models.schemas import (
    ConversationRequest,
    GenerateNotesResponse,
    TranscriptionResponse,
)
from app.services.ai_pipeline    import generate_clinical_notes
from app.services.transcription  import transcribe_audio
from app.services.vector_store   import note_store

logger = logging.getLogger(__name__)

# APIRouter lets us group related endpoints; main.py mounts with prefix /api
router = APIRouter()

# Allowed audio MIME types for upload validation
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
    "audio/x-wav", "audio/mp4", "audio/m4a", "audio/webm",
    "audio/ogg", "video/webm",          # some browsers send webm for voice
}

MAX_AUDIO_SIZE_MB = 25  # OpenAI Whisper API limit


# ---------------------------------------------------------------------------
# POST /api/generate-notes  (text input)
# ---------------------------------------------------------------------------

@router.post(
    "/generate-notes",
    response_model=GenerateNotesResponse,
    summary="Generate clinical notes from conversation text",
    description=(
        "Accepts a raw doctor-patient conversation as text and returns "
        "a structured clinical note (symptoms, diagnosis, treatment, "
        "medications, follow-up)."
    ),
)
async def generate_notes_from_text(request: ConversationRequest):
    """
    Main endpoint: text conversation → structured JSON clinical note.

    Flow
    ----
    1. Receive and validate the request body (Pydantic handles this)
    2. Call the AI pipeline service
    3. Optionally store the note in the vector DB
    4. Return the structured response
    """
    try:
        logger.info("Generating clinical note from text input…")

        clinical_note, raw_text = await generate_clinical_notes(
            conversation  = request.conversation,
            patient_name  = request.patient_name,
            visit_date    = request.visit_date,
        )

        # Persist to vector store (fire-and-forget; errors are logged, not raised)
        try:
            note_id = str(uuid.uuid4())
            note_store.add_note(
                note         = clinical_note,
                note_id      = note_id,
                patient_name = request.patient_name,
                visit_date   = request.visit_date,
            )
        except Exception as vs_err:
            logger.warning("Vector store write failed (non-critical): %s", vs_err)

        return GenerateNotesResponse(
            success       = True,
            clinical_note = clinical_note,
            raw_text      = raw_text,
            patient_name  = request.patient_name,
            visit_date    = request.visit_date,
        )

    except ValueError as e:
        # Config errors (missing API key, etc.)
        logger.error("Configuration error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        logger.exception("Unexpected error generating notes: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate clinical notes: {str(e)}",
        )


# ---------------------------------------------------------------------------
# POST /api/generate-notes/audio  (audio upload)
# ---------------------------------------------------------------------------

@router.post(
    "/generate-notes/audio",
    response_model=GenerateNotesResponse,
    summary="Generate clinical notes from an audio recording",
    description=(
        "Upload an audio file of the doctor-patient consultation. "
        "The file will be transcribed with Whisper, then processed "
        "by the AI pipeline to produce structured clinical notes."
    ),
)
async def generate_notes_from_audio(
    audio_file:   UploadFile   = File(..., description="Audio recording (mp3/wav/m4a/webm, max 25 MB)"),
    patient_name: Optional[str] = Form(None, description="Patient's name"),
    visit_date:   Optional[str] = Form(None, description="Visit date (YYYY-MM-DD)"),
):
    """
    Audio upload endpoint: audio → transcription → clinical note.

    Multipart/form-data fields:
      audio_file   : the audio binary
      patient_name : optional string
      visit_date   : optional string
    """

    # ── Validate content type ─────────────────────────────────────────────
    content_type = audio_file.content_type or ""
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported audio format: '{content_type}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_AUDIO_TYPES))}"
            ),
        )

    # ── Read and validate file size ───────────────────────────────────────
    audio_bytes = await audio_file.read()
    size_mb = len(audio_bytes) / (1024 * 1024)
    if size_mb > MAX_AUDIO_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed: {MAX_AUDIO_SIZE_MB} MB.",
        )

    try:
        # ── Step 1: Transcribe ────────────────────────────────────────────
        logger.info("Transcribing audio file: %s (%.2f MB)", audio_file.filename, size_mb)
        transcription = await transcribe_audio(audio_bytes, audio_file.filename or "upload.wav")

        if not transcription or len(transcription.strip()) < 20:
            raise HTTPException(
                status_code=422,
                detail="Transcription was too short or empty. Check the audio quality.",
            )

        # ── Step 2: Generate Notes ────────────────────────────────────────
        logger.info("Transcription complete (%d chars). Generating notes…", len(transcription))
        clinical_note, raw_text = await generate_clinical_notes(
            conversation  = transcription,
            patient_name  = patient_name,
            visit_date    = visit_date,
        )

        # ── Step 3: Store in vector DB ────────────────────────────────────
        try:
            note_id = str(uuid.uuid4())
            note_store.add_note(
                note         = clinical_note,
                note_id      = note_id,
                patient_name = patient_name,
                visit_date   = visit_date,
            )
        except Exception as vs_err:
            logger.warning("Vector store write failed (non-critical): %s", vs_err)

        return GenerateNotesResponse(
            success       = True,
            clinical_note = clinical_note,
            raw_text      = raw_text,
            transcription = transcription,
            patient_name  = patient_name,
            visit_date    = visit_date,
        )

    except HTTPException:
        raise  # re-raise already-formatted HTTP errors
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("Error processing audio: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process audio: {str(e)}",
        )


# ---------------------------------------------------------------------------
# POST /api/transcribe  (audio → text only)
# ---------------------------------------------------------------------------

@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Transcribe audio to text (no note generation)",
    description="Standalone transcription endpoint — useful for previewing the audio text before generating notes.",
)
async def transcribe_only(
    audio_file: UploadFile = File(..., description="Audio file to transcribe"),
):
    """Transcribe audio without generating clinical notes."""
    audio_bytes = await audio_file.read()
    try:
        transcription = await transcribe_audio(audio_bytes, audio_file.filename or "upload.wav")
        return TranscriptionResponse(success=True, transcription=transcription)
    except Exception as e:
        logger.exception("Transcription error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /api/search-notes  (semantic search)
# ---------------------------------------------------------------------------

@router.get(
    "/search-notes",
    summary="Semantic search over stored clinical notes",
    description="Use natural language to find similar past notes in the vector store.",
)
async def search_notes(
    query: str = Query(..., description="Natural language search query"),
    k:     int = Query(5, ge=1, le=20, description="Number of results to return"),
):
    """Return the k most semantically similar notes to the query string."""
    try:
        results = note_store.search(query, k=k)
        return {"success": True, "results": results, "count": len(results)}
    except Exception as e:
        logger.exception("Search error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))