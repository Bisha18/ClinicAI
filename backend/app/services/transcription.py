"""
app/services/transcription.py
==============================
Audio -> text using Gemini's multimodal API via the google-genai 1.x SDK.

google-genai 1.x completely replaces the EOL google-generativeai SDK.
The old API (genai.configure / genai.GenerativeModel) no longer exists.

New API pattern:
  client = genai.Client(api_key=...)
  await client.aio.models.generate_content(model=..., contents=[...])

Audio bytes are passed as types.Part.from_bytes(data=..., mime_type=...).
client.aio is a native async interface — no run_in_executor needed.

Supported formats: MP3, WAV, M4A, OGG, FLAC, WebM, AIFF
Max size: 20 MB inline.
"""

import os
import logging
from pathlib import Path

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MAX_BYTES = 20 * 1024 * 1024   # 20 MB

MIME_MAP = {
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

PROMPT = (
    "This is a medical consultation recording between a doctor and a patient. "
    "Transcribe the entire conversation accurately. "
    "Label each speaker as 'Doctor:' or 'Patient:' before their words. "
    "Preserve all medical terms, drug names, and dosages exactly as spoken. "
    "Output only the transcript -- no preamble or commentary."
)


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """
    Transcribe audio bytes using Gemini's multimodal API (google-genai 1.x).

    Uses client.aio.models.generate_content() — the native async interface —
    so no thread-pool executor is required.

    Raises ValueError if GOOGLE_API_KEY is missing or file > 20 MB.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY is not set. "
            "Get a free key: https://aistudio.google.com/app/apikey"
        )

    if len(audio_bytes) > MAX_BYTES:
        mb = len(audio_bytes) / (1024 * 1024)
        raise ValueError(f"Audio too large ({mb:.1f} MB). Max is 20 MB.")

    ext        = Path(filename).suffix.lower()
    mime_type  = MIME_MAP.get(ext, "audio/mp3")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    logger.info("Transcribing '%s' (%.1f MB) with %s...",
                filename, len(audio_bytes) / (1024 * 1024), model_name)

    # google-genai 1.x: Client-based API replaces the old genai.configure()
    # + genai.GenerativeModel() pattern which no longer exists in this SDK.
    client = genai.Client(api_key=api_key)

    # types.Part.from_bytes replaces the old inline_data dict approach.
    audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)

    # client.aio is the fully async interface — awaitable directly.
    response = await client.aio.models.generate_content(
        model    = model_name,
        contents = [audio_part, PROMPT],
    )

    transcript = response.text.strip()
    logger.info("Transcription done (%d chars).", len(transcript))
    return transcript