"""
services/vector_store.py
========================
Optional vector database for storing and semantically searching
generated clinical notes — now using Google's embedding model.

Embeddings are generated with:
  models/text-embedding-004  (Google's latest, 768 dimensions)

This replaces the previous OpenAI embeddings with zero extra cost
on the Gemini free tier (up to 1,500 RPD).

Two backends:
  "faiss"  → in-memory / disk-persisted FAISS (default, no server)
  "chroma" → ChromaDB persistent store
"""

import os
import json
import logging
from typing import Optional
from datetime import datetime

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from dotenv import load_dotenv

from app.models.schemas import ClinicalNote

load_dotenv()
logger = logging.getLogger(__name__)

VECTOR_STORE_BACKEND = os.getenv("VECTOR_STORE_BACKEND", "faiss")
FAISS_PERSIST_PATH   = os.getenv("FAISS_PERSIST_PATH",   "./data/faiss_index")
CHROMA_PERSIST_PATH  = os.getenv("CHROMA_PERSIST_PATH",  "./data/chroma_db")


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    """Return Google embeddings model (text-embedding-004)."""
    return GoogleGenerativeAIEmbeddings(
        model          = "models/text-embedding-004",
        google_api_key = os.getenv("GOOGLE_API_KEY"),
    )


def _note_to_document(
    note: ClinicalNote,
    patient_name: Optional[str],
    visit_date:   Optional[str],
    note_id:      str,
) -> Document:
    full_text = (
        f"Patient Symptoms: {note.patient_symptoms}\n"
        f"Diagnosis: {note.diagnosis}\n"
        f"Treatment Plan: {note.treatment_plan}\n"
        f"Medications: {note.medications}\n"
        f"Follow-up Instructions: {note.follow_up}"
    )
    metadata = {
        "note_id":      note_id,
        "patient_name": patient_name or "Unknown",
        "visit_date":   visit_date or datetime.utcnow().strftime("%Y-%m-%d"),
        "note_json":    json.dumps(note.model_dump()),
    }
    return Document(page_content=full_text, metadata=metadata)


class FAISSNoteStore:
    """In-memory / disk-persisted FAISS vector store with Google embeddings."""

    def __init__(self):
        self._store = None

    def add_note(self, note, note_id, patient_name=None, visit_date=None):
        try:
            from langchain_community.vectorstores import FAISS
        except ImportError:
            logger.warning("FAISS not available. pip install faiss-cpu langchain-community")
            return
        doc = _note_to_document(note, patient_name, visit_date, note_id)
        if self._store is None:
            self._store = FAISS.from_documents([doc], _get_embeddings())
        else:
            self._store.add_documents([doc])
        logger.info("Note %s stored in FAISS.", note_id)

    def search(self, query: str, k: int = 5) -> list[dict]:
        if self._store is None:
            return []
        results = self._store.similarity_search(query, k=k)
        return [
            {"metadata": r.metadata, "note": json.loads(r.metadata.get("note_json", "{}"))}
            for r in results
        ]

    def save(self):
        if self._store:
            os.makedirs(FAISS_PERSIST_PATH, exist_ok=True)
            self._store.save_local(FAISS_PERSIST_PATH)

    def load(self):
        try:
            from langchain_community.vectorstores import FAISS
        except ImportError:
            return
        if os.path.exists(FAISS_PERSIST_PATH):
            self._store = FAISS.load_local(
                FAISS_PERSIST_PATH, _get_embeddings(),
                allow_dangerous_deserialization=True,
            )


class ChromaNoteStore:
    """ChromaDB persistent vector store with Google embeddings."""

    def __init__(self):
        self._store = None

    def _get_store(self):
        if self._store is None:
            try:
                from langchain_community.vectorstores import Chroma
            except ImportError:
                raise ImportError("pip install chromadb langchain-community")
            self._store = Chroma(
                collection_name    = "clinical_notes",
                embedding_function = _get_embeddings(),
                persist_directory  = CHROMA_PERSIST_PATH,
            )
        return self._store

    def add_note(self, note, note_id, patient_name=None, visit_date=None):
        doc = _note_to_document(note, patient_name, visit_date, note_id)
        self._get_store().add_documents([doc])

    def search(self, query: str, k: int = 5) -> list[dict]:
        results = self._get_store().similarity_search_with_score(query, k=k)
        return [
            {"score": float(s), "metadata": d.metadata, "note": json.loads(d.metadata.get("note_json", "{}"))}
            for d, s in results
        ]


def get_note_store():
    if VECTOR_STORE_BACKEND == "chroma":
        return ChromaNoteStore()
    return FAISSNoteStore()


note_store = get_note_store()