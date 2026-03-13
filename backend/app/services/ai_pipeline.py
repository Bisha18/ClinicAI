"""
services/ai_pipeline.py
=======================
Core AI logic — LangChain + Google Gemini 1.5 Flash.

Key components
--------------
1. Prompt Template  — clinical scribe instructions
2. LLM              — Gemini 1.5 Flash (free tier: 15 RPM, 1M TPM)
3. Output Parser    — extracts the five clinical sections
4. Chain            — LCEL pipe: prompt | llm | parser

Get a free Gemini API key at: https://aistudio.google.com/app/apikey
"""

import os
import re
import logging
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

from app.models.schemas import ClinicalNote

load_dotenv()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt Engineering
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert clinical documentation assistant working alongside doctors.
Your task is to read a doctor-patient conversation and extract structured medical information
to produce a professional, accurate clinical note.

STRICT RULES:
- Use proper clinical/medical terminology throughout.
- Do NOT invent or assume information not present in the conversation.
- If a section has no relevant information, write exactly: Not mentioned.
- Output ONLY the five labeled sections below — no preamble, no extra text, no markdown.
- Use exactly these section headings followed by a colon.

REQUIRED OUTPUT FORMAT:
Patient Symptoms: <chief complaint and all reported symptoms>
Diagnosis: <probable or confirmed diagnosis based on the conversation>
Treatment Plan: <recommended treatments, procedures, tests ordered, lifestyle advice>
Medications: <drug name, dose, frequency, duration — or Not mentioned.>
Follow-up Instructions: <return timeline, warning signs, next steps>"""

HUMAN_PROMPT = """Generate a structured clinical note from the following doctor-patient conversation:

{conversation}"""


# ---------------------------------------------------------------------------
# Helper: Parse LLM Text → ClinicalNote
# ---------------------------------------------------------------------------
def _parse_clinical_note(raw_text: str) -> ClinicalNote:
    """Extract section values from Gemini's plain-text output."""
    sections = {
        "patient_symptoms": r"Patient Symptoms\s*:(.*?)(?=Diagnosis\s*:|$)",
        "diagnosis":        r"Diagnosis\s*:(.*?)(?=Treatment Plan\s*:|$)",
        "treatment_plan":   r"Treatment Plan\s*:(.*?)(?=Medications\s*:|$)",
        "medications":      r"Medications\s*:(.*?)(?=Follow-up Instructions\s*:|$)",
        "follow_up":        r"Follow-up Instructions\s*:(.*?)$",
    }
    extracted = {}
    for field, pattern in sections.items():
        match = re.search(pattern, raw_text, re.IGNORECASE | re.DOTALL)
        if match:
            value = match.group(1).strip()
            extracted[field] = value if value else "Not mentioned."
        else:
            extracted[field] = "Not mentioned."
            logger.warning("Section '%s' not found in Gemini output.", field)
    return ClinicalNote(**extracted)


# ---------------------------------------------------------------------------
# Main Service Function
# ---------------------------------------------------------------------------
async def generate_clinical_notes(
    conversation: str,
    patient_name: Optional[str] = None,
    visit_date:   Optional[str] = None,
) -> tuple[ClinicalNote, str]:
    """
    Run LangChain + Gemini and return (ClinicalNote, raw_gemini_text).

    Raises ValueError if GOOGLE_API_KEY is missing.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY not set. "
            "Get a free key at https://aistudio.google.com/app/apikey "
            "and add it to backend/.env"
        )

    # Prepend patient metadata
    header_parts = []
    if patient_name:
        header_parts.append(f"Patient Name: {patient_name}")
    if visit_date:
        header_parts.append(f"Visit Date: {visit_date}")
    full_conversation = (
        "\n".join(header_parts) + "\n\n" + conversation
        if header_parts else conversation
    )

    # Build chain
    # gemini-1.5-flash  → fast, cheap, great for structured extraction
    # gemini-1.5-pro    → slower, higher quality for complex cases
    # gemini-2.0-flash  → latest, override with GEMINI_MODEL in .env
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    llm = ChatGoogleGenerativeAI(
        model          = model_name,
        temperature    = 0,
        google_api_key = api_key,
        convert_system_message_to_human = True,   # Required by Gemini API
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human",  HUMAN_PROMPT),
    ])

    chain = prompt | llm | StrOutputParser()

    logger.info("Invoking Gemini (%s)…", model_name)
    raw_text: str = await chain.ainvoke({"conversation": full_conversation})
    logger.info("Gemini responded (%d chars).", len(raw_text))

    return _parse_clinical_note(raw_text), raw_text