"""
services/transcription.py
=========================
Audio-to-text transcription using Google Gemini's native multimodal API.

Gemini 1.5 Flash/Pro can directly process audio files — no separate
speech-to-text service needed. We send the audio bytes as a base64-encoded
inline blob alongside a transcription instruction.

Supported formats: mp3, wav, aiff, aac, ogg, flac, webm, m4a
Max file size: 20 MB inline (larger files need Google File API — see note below)

Why Gemini for transcription?
  - No extra API key or service (reuses GOOGLE_API_KEY)
  - Understands medical terminology natively
  - Can transcribe AND contextually label speakers (Doctor/Patient)
  - Single API call replaces a two-step Whisper + LLM pipeline
"""

import os
import base64
import logging
import mimetypes
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Gemini inline data limit (bytes). Above this we'd need the File API.
INLINE_SIZE_LIMIT = 20 * 1024 * 1024   # 20 MB

# Map common extensions → MIME types Gemini accepts for audio
AUDIO_MIME_MAP = {
    ".mp3":  "audio/mp3",
    ".mp4":  "audio/mp4",
    ".m4a":  "audio/mp4",
    ".wav":  "audio/wav",
    ".wave": "audio/wav",
    ".aiff": "audio/aiff",
    ".aac":  "audio/aac",
    ".ogg":  "audio/ogg",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
}


def _get_mime_type(filename: str) -> str:
    """Resolve MIME type from filename extension."""
    ext = Path(filename).suffix.lower()
    return AUDIO_MIME_MAP.get(ext, "audio/mp3")


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """
    Transcribe audio using Gemini's multimodal capabilities.

    Sends the audio inline as a base64-encoded blob. Gemini returns a
    speaker-labelled transcript (Doctor / Patient), which is exactly
    the format our AI pipeline expects.

    Parameters
    ----------
    audio_bytes : bytes
        Raw audio file contents (max 20 MB).
    filename : str
        Original filename — used to determine MIME type.

    Returns
    -------
    str
        Full transcription text with speaker labels.

    Raises
    ------
    ValueError
        If GOOGLE_API_KEY is missing or file is too large.
    google.api_core.exceptions.GoogleAPIError
        On Gemini API errors.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY not set. "
            "Get a free key at https://aistudio.google.com/app/apikey"
        )

    if len(audio_bytes) > INLINE_SIZE_LIMIT:
        size_mb = len(audio_bytes) / (1024 * 1024)
        raise ValueError(
            f"Audio file too large ({size_mb:.1f} MB). "
            f"Maximum supported size is 20 MB."
        )

    mime_type = _get_mime_type(filename)
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    logger.info(
        "Transcribing %s (%.2f MB) with Gemini %s…",
        filename, len(audio_bytes) / (1024 * 1024), model_name
    )

    # Configure the Gemini SDK
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    # Build the multimodal prompt
    # Gemini receives: [audio_blob, text_instruction]
    transcription_prompt = (
        "This is a medical consultation recording between a doctor and a patient. "
        "Please transcribe the entire conversation accurately. "
        "Label each speaker as 'Doctor:' or 'Patient:' before their words. "
        "Preserve all medical terms, drug names, and dosages exactly as spoken. "
        "Output only the transcript — no preamble or commentary."
    )

    audio_part = {
        "inline_data": {
            "mime_type": mime_type,
            "data": base64.b64encode(audio_bytes).decode("utf-8"),
        }
    }

    response = model.generate_content([audio_part, transcription_prompt])
    transcript = response.text.strip()

    logger.info("Transcription complete (%d chars).", len(transcript))
    return transcript