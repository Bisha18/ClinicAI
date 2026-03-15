"""
app/services/vector_store.py
=============================
Optional semantic search over saved clinical notes using FAISS or ChromaDB
with Google's text-embedding-004 model (768 dimensions, free tier).

This feature is optional — the app works fully without it.
To enable: uncomment faiss-cpu and langchain-community in requirements.txt

Usage
-----
  note_store.add_note(clinical_note, record_id, patient_name, visit_date)
  results = note_store.search("chest pain with ST elevation", k=5)

Backend options
---------------
  VECTOR_STORE_BACKEND=faiss   (default) — in-memory, persisted to disk
  VECTOR_STORE_BACKEND=chroma  — persistent ChromaDB directory
"""

import os
import json
import logging
from datetime import datetime, timezone  # FIX: added timezone
from typing import Optional

from dotenv import load_dotenv

from app.models.schemas import ClinicalNote

load_dotenv()
logger = logging.getLogger(__name__)

VECTOR_STORE_BACKEND = os.getenv("VECTOR_STORE_BACKEND", "faiss")
FAISS_PERSIST_PATH   = os.getenv("FAISS_PERSIST_PATH",   "./data/faiss_index")
CHROMA_PERSIST_PATH  = os.getenv("CHROMA_PERSIST_PATH",  "./data/chroma_db")


def _utcnow_str() -> str:
    # FIX: datetime.utcnow() deprecated; use timezone-aware equivalent.
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _get_embeddings():
    """Return Google text-embedding-004 model (768 dimensions, free tier)."""
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    return GoogleGenerativeAIEmbeddings(
        model          = "models/text-embedding-004",
        google_api_key = os.getenv("GOOGLE_API_KEY"),
    )


def _note_to_document(
    note:         ClinicalNote,
    note_id:      str,
    patient_name: Optional[str] = None,
    visit_date:   Optional[str] = None,
):
    from langchain_core.documents import Document
    full_text = (
        f"Patient Symptoms: {note.patient_symptoms}\n"
        f"Diagnosis: {note.diagnosis}\n"
        f"Treatment Plan: {note.treatment_plan}\n"
        f"Medications: {note.medications}\n"
        f"Follow-up: {note.follow_up}"
    )
    return Document(
        page_content = full_text,
        metadata     = {
            "note_id":      note_id,
            "patient_name": patient_name or "Unknown",
            "visit_date":   visit_date or _utcnow_str(),  # FIX
            "note_json":    json.dumps(note.model_dump()),
        },
    )


class FAISSNoteStore:
    """FAISS-backed vector store. In-memory during runtime, saved to disk."""

    def __init__(self):
        self._store = None

    def add_note(
        self,
        note:         ClinicalNote,
        note_id:      str,
        patient_name: Optional[str] = None,
        visit_date:   Optional[str] = None,
    ) -> None:
        try:
            from langchain_community.vectorstores import FAISS
        except ImportError:
            logger.warning("FAISS not available. pip install faiss-cpu langchain-community")
            return
        doc = _note_to_document(note, note_id, patient_name, visit_date)
        if self._store is None:
            self._store = FAISS.from_documents([doc], _get_embeddings())
        else:
            self._store.add_documents([doc])
        logger.info("Note %s indexed in FAISS.", note_id)

    def search(self, query: str, k: int = 5) -> list[dict]:
        if self._store is None:
            return []
        results = self._store.similarity_search(query, k=k)
        return [
            {
                "metadata": r.metadata,
                "note":     json.loads(r.metadata.get("note_json", "{}")),
            }
            for r in results
        ]


class ChromaNoteStore:
    """ChromaDB-backed vector store. Persisted to CHROMA_PERSIST_PATH."""

    def __init__(self):
        self._store = None

    def _get_store(self):
        if self._store is None:
            from langchain_community.vectorstores import Chroma
            self._store = Chroma(
                collection_name    = "clinical_notes",
                embedding_function = _get_embeddings(),
                persist_directory  = CHROMA_PERSIST_PATH,
            )
        return self._store

    def add_note(
        self,
        note:         ClinicalNote,
        note_id:      str,
        patient_name: Optional[str] = None,
        visit_date:   Optional[str] = None,
    ) -> None:
        doc = _note_to_document(note, note_id, patient_name, visit_date)
        self._get_store().add_documents([doc])

    def search(self, query: str, k: int = 5) -> list[dict]:
        # FIX: Guard against searching an uninitialised store (no notes added yet).
        # Previously this would call _get_store() unconditionally, spinning up a
        # Chroma client and creating the persist directory even when empty.
        # Mirror the same guard used by FAISSNoteStore.
        if self._store is None:
            return []
        results = self._store.similarity_search_with_score(query, k=k)
        return [
            {
                "score":    float(s),
                "metadata": d.metadata,
                "note":     json.loads(d.metadata.get("note_json", "{}")),
            }
            for d, s in results
        ]


# Module-level singleton
def _make_store():
    if VECTOR_STORE_BACKEND == "chroma":
        return ChromaNoteStore()
    return FAISSNoteStore()


note_store = _make_store()