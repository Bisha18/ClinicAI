"""
app/models/database.py
======================
MongoDB document models using Beanie ODM.

Beanie wraps Motor (async MongoDB driver) + Pydantic:
  - Type-safe async CRUD  (.insert, .find, .get, .delete)
  - Automatic index creation on startup
  - No migrations needed — MongoDB is schemaless

Collections
-----------
  users             →  Registered doctors / clinicians
  patient_records   →  AI-generated clinical notes

Init
----
  Call await init_db() once in main.py lifespan before handling requests.
"""

import os
from datetime import datetime, timezone  # FIX: added timezone
from typing import Optional, Annotated

from beanie import Document, Indexed, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import Field
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB",  "clinical_notes")


def _utcnow() -> datetime:
    # FIX: datetime.utcnow() is deprecated in Python 3.12+.
    # Use timezone-aware datetime.now(timezone.utc) instead.
    return datetime.now(timezone.utc)


class User(Document):
    """
    Registered doctor / clinician account.
    Passwords are stored as bcrypt hashes — never plaintext.
    email is unique-indexed via Annotated[str, Indexed(unique=True)].
    """
    email:           Annotated[str, Indexed(unique=True)]
    full_name:       str
    hashed_password: str
    specialty:       Optional[str] = None
    is_active:       bool          = True
    created_at:      datetime      = Field(default_factory=_utcnow)  # FIX

    class Settings:
        name = "users"


class PatientRecord(Document):
    """
    A single AI-generated clinical note linked to a User.
    user_id is a plain string (hex ObjectId) for easy querying.
    """
    user_id:          Annotated[str, Indexed()]

    patient_name:     Optional[str] = None
    visit_date:       Optional[str] = None

    conversation:     str
    input_mode:       str           = "text"   # "text" | "audio"
    transcription:    Optional[str] = None

    patient_symptoms: str
    diagnosis:        str
    treatment_plan:   str
    medications:      str
    follow_up:        str

    gemini_model:     Optional[str] = None
    created_at:       datetime      = Field(default_factory=_utcnow)  # FIX
    updated_at:       datetime      = Field(default_factory=_utcnow)  # FIX

    class Settings:
        name = "patient_records"


async def init_db() -> None:
    """
    Connect Motor to MongoDB and initialise Beanie.
    Beanie creates all indexes defined via Indexed() in the models above.
    Called once from main.py lifespan before accepting requests.
    """
    client = AsyncIOMotorClient(MONGO_URI)
    await init_beanie(
        database        = client[MONGO_DB],
        document_models = [User, PatientRecord],
    )