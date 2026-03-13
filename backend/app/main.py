"""
AI Clinical Notes Generator - FastAPI Backend
=============================================
Main application entry point. Initializes the FastAPI app,
registers routes, and configures CORS for the frontend.

Architecture:
  main.py          → App bootstrap, CORS, route registration
  routes/notes.py  → HTTP endpoint handlers
  services/        → Business logic (AI pipeline, transcription)
  models/          → Pydantic schemas for request/response
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import notes
import uvicorn

# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Clinical Notes Generator",
    description="Converts doctor-patient conversations into structured clinical notes using LangChain + LLM",
    version="1.0.0",
    docs_url="/docs",      # Swagger UI at /docs
    redoc_url="/redoc",    # ReDoc UI at /redoc
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
# Allow the React frontend (running on port 5173 via Vite or 3000 via CRA)
# to communicate with this backend (running on port 8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Route Registration
# ---------------------------------------------------------------------------
# All clinical-notes endpoints are prefixed with /api
app.include_router(notes.router, prefix="/api", tags=["Clinical Notes"])


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
async def root():
    """Health check — confirms the API is running."""
    return {
        "status": "ok",
        "message": "AI Clinical Notes Generator API is running",
        "docs": "/docs",
    }


# ---------------------------------------------------------------------------
# Dev Server Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Run with: python -m app.main  (from /backend directory)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)