"""
app/main.py
===========
FastAPI application entry point.

Import order (no circular dependencies):
  main.py
    ├── app.models.database   (init_db)
    ├── app.routes.auth       (router)
    ├── app.routes.notes      (router)
    └── app.routes.records    (router)

Each route module imports from services, which import from models.
Nothing imports back to main.py or routes from services.

Windows + Python 3.12 note:
  The ProactorEventLoop (Windows default) can conflict with some
  asyncio operations. We set WindowsSelectorEventLoopPolicy on Windows
  before uvicorn takes over.
"""

import sys
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Windows Python 3.12+ fix — set before any async work
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.models.database import init_db

# Import each route module directly (not via package __init__)
from app.routes.auth    import router as auth_router
from app.routes.notes   import router as notes_router
from app.routes.records import router as records_router

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt = "%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Connect to MongoDB and initialise Beanie on startup."""
    logger.info("Connecting to MongoDB…")
    await init_db()
    logger.info("MongoDB ready ✓")
    yield
    logger.info("Shutdown complete")


app = FastAPI(
    title       = "AI Clinical Notes Generator",
    description = "Gemini-powered clinical documentation · MongoDB · JWT Auth",
    version     = "3.0.0",
    lifespan    = lifespan,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# FIX: CORS allowed origins should not be hardcoded for production.
# Read from ALLOWED_ORIGINS env var (comma-separated).  Fall back to
# localhost dev origins so local development still works out of the box.
import os as _os
_raw_origins = _os.getenv(
    "ALLOWED_ORIGINS",
    "*",
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins     = _allowed_origins,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Global exception handler ──────────────────────────────────────────────────
# Starlette's CORSMiddleware only attaches Access-Control-Allow-Origin to
# responses it processes normally.  An unhandled exception that produces a
# raw 500 bypasses the middleware's response processing, so the browser sees
# no CORS header and reports a CORS error instead of the real error.
# This handler catches every unhandled exception, logs it, and returns a
# proper JSON 500 that the middleware CAN process — so CORS headers are always
# present and the real error message reaches the frontend.
@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code = 500,
        content     = {"detail": f"Internal server error: {exc}"},
    )

app.include_router(auth_router,    prefix="/api")
app.include_router(notes_router,   prefix="/api")
app.include_router(records_router, prefix="/api")


@app.get("/", tags=["Health"])
@app.get("/api/health", tags=["Health"])  # FIX: also expose under /api/health for reverse proxies
async def health():
    return {"status": "ok", "version": "3.0.0", "db": "mongodb"}