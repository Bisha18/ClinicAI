"""
app/services/ai_pipeline.py
============================
Core AI logic -- LangChain LCEL pipeline with Google Gemini via
langchain-google-genai 4.x.

Changes from the old 2.x version:
  - google_api_key kwarg renamed to api_key in ChatGoogleGenerativeAI 4.x
  - convert_system_message_to_human removed (already fixed previously)
  - Default model updated to gemini-2.0-flash (gemini-1.5-flash still works)

Pipeline
--------
  1. ChatPromptTemplate  ->  Injects conversation text into system+human prompt
  2. ChatGoogleGenerativeAI  ->  Sends the prompt to Gemini (async)
  3. StrOutputParser     ->  Extracts the raw string from the model response
  4. _parse_clinical_note  ->  Parses the five labelled sections from the text
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
# Prompt Templates
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert clinical documentation assistant working alongside doctors.
Your task is to read a doctor-patient conversation and extract structured medical information
to produce a professional, accurate clinical note.

STRICT RULES:
- Use proper clinical/medical terminology throughout.
- Do NOT invent or assume information not present in the conversation.
- If a section has no relevant information, write exactly: Not mentioned.
- Output ONLY the five labelled sections below -- no preamble, no commentary, no markdown.
- Use exactly these headings followed by a colon.

REQUIRED OUTPUT FORMAT:
Patient Symptoms: <chief complaint and all reported symptoms with duration and severity>
Diagnosis: <probable or confirmed diagnosis>
Treatment Plan: <recommended treatments, procedures, tests ordered, lifestyle advice>
Medications: <drug name, dose, frequency, duration -- or Not mentioned.>
Follow-up Instructions: <return timeline, warning signs, next steps>"""

HUMAN_PROMPT = """Generate a structured clinical note from the following doctor-patient conversation:

{conversation}"""


# ---------------------------------------------------------------------------
# Output Parser
# ---------------------------------------------------------------------------

def _parse_clinical_note(raw_text: str) -> ClinicalNote:
    """
    Extract the five section values from Gemini's plain-text output.

    Uses regex with DOTALL so multi-line values are captured.
    Falls back to "Not mentioned." for any missing section.
    """
    section_patterns = {
        "patient_symptoms": r"Patient Symptoms\s*:(.*?)(?=Diagnosis\s*:|$)",
        "diagnosis":        r"Diagnosis\s*:(.*?)(?=Treatment Plan\s*:|$)",
        "treatment_plan":   r"Treatment Plan\s*:(.*?)(?=Medications\s*:|$)",
        "medications":      r"Medications\s*:(.*?)(?=Follow-up Instructions\s*:|$)",
        "follow_up":        r"Follow-up Instructions\s*:(.*?)$",
    }

    extracted: dict[str, str] = {}
    for field, pattern in section_patterns.items():
        match = re.search(pattern, raw_text, re.IGNORECASE | re.DOTALL)
        value = match.group(1).strip() if match else ""
        extracted[field] = value if value else "Not mentioned."
        if not match:
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
    Run the LangChain + Gemini pipeline and return a structured ClinicalNote.

    Parameters
    ----------
    conversation : str
        Raw doctor-patient dialogue text.
    patient_name : str, optional
        Prepended to the conversation for context.
    visit_date : str, optional
        Prepended to the conversation for context.

    Returns
    -------
    tuple[ClinicalNote, str]
        (structured_note, raw_gemini_response_text)

    Raises
    ------
    ValueError
        If GOOGLE_API_KEY is not configured.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY is not set. "
            "Get a free key at https://aistudio.google.com/app/apikey "
            "then add it to backend/.env"
        )

    header_parts: list[str] = []
    if patient_name:
        header_parts.append(f"Patient Name: {patient_name}")
    if visit_date:
        header_parts.append(f"Visit Date: {visit_date}")

    full_conversation = (
        "\n".join(header_parts) + "\n\n" + conversation
        if header_parts else conversation
    )

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    # FIX: langchain-google-genai 4.x renamed google_api_key -> api_key.
    # Passing google_api_key to the 4.x constructor raises a ValidationError.
    # convert_system_message_to_human was already removed in a prior fix.
    llm = ChatGoogleGenerativeAI(
        model       = model_name,
        temperature = 0,
        api_key     = api_key,   # FIX: was google_api_key in 2.x
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human",  HUMAN_PROMPT),
    ])

    chain = prompt | llm | StrOutputParser()

    logger.info("Calling Gemini (%s)...", model_name)
    raw_text: str = await chain.ainvoke({"conversation": full_conversation})
    logger.info("Gemini responded (%d chars).", len(raw_text))

    return _parse_clinical_note(raw_text), raw_text