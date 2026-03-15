"""
app/services/auth.py
====================
Password hashing, JWT creation/verification, and the FastAPI dependency
that injects the current authenticated user into protected route handlers.

JWT library: PyJWT (replaces python-jose which has known CVEs).

Environment variables required
-------------------------------
  JWT_SECRET_KEY   — at least 32 random bytes, base64 or hex encoded
                     Generate one with: python -c "import secrets; print(secrets.token_hex(32))"
  JWT_ALGORITHM    — default "HS256"
  JWT_EXPIRE_MINUTES — default 60 * 24 (24 hours)
"""

import os
import logging
from datetime import datetime, timezone, timedelta

import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.models.database import User

logger = logging.getLogger(__name__)

# ── JWT configuration ─────────────────────────────────────────────────────────

SECRET_KEY      = os.getenv("JWT_SECRET_KEY")
ALGORITHM       = os.getenv("JWT_ALGORITHM",      "HS256")
EXPIRE_MINUTES  = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24)))  # 24 h default

if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is not set. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

# ── Password hashing ──────────────────────────────────────────────────────────

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches the stored *hashed* password."""
    return _pwd_context.verify(plain, hashed)


# ── Token creation ────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    """
    Create a signed JWT that encodes the user's MongoDB ObjectId as the 'sub' claim.
    Expiry defaults to JWT_EXPIRE_MINUTES (24 h).
    """
    expire  = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── FastAPI dependency ────────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=True)

_credentials_exception = HTTPException(
    status_code = status.HTTP_401_UNAUTHORIZED,
    detail      = "Could not validate credentials",
    headers     = {"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> User:
    """
    FastAPI dependency — decode the Bearer JWT and return the matching User.

    Raises HTTP 401 if the token is missing, expired, or invalid.
    Raises HTTP 401 if the user_id in the token no longer exists in MongoDB.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise _credentials_exception
    except InvalidTokenError:
        raise _credentials_exception

    from beanie import PydanticObjectId
    try:
        oid = PydanticObjectId(user_id)
    except Exception:
        raise _credentials_exception

    user = await User.get(oid)
    if user is None:
        raise _credentials_exception
    return user