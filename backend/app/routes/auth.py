"""
app/routes/auth.py
==================
Authentication endpoints — fully async, all DB calls via Beanie.

POST /api/auth/signup  → create User document, return JWT
POST /api/auth/login   → verify password, return JWT
GET  /api/auth/me      → return current user profile

Beanie query patterns used here:
  User.find_one(User.email == x)  → fetch one document by field
  user.insert()                   → insert new document into MongoDB
"""

import logging
from fastapi import APIRouter, HTTPException, Depends

from app.models.database import User
from app.models.schemas  import SignupRequest, LoginRequest, TokenResponse, UserProfile
from app.services.auth   import hash_password, verify_password, create_access_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def _to_profile(user: User) -> UserProfile:
    """Convert a Beanie User document to a UserProfile response schema."""
    return UserProfile(
        id         = str(user.id),
        email      = user.email,
        full_name  = user.full_name,
        specialty  = user.specialty,
        created_at = user.created_at,
    )


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupRequest):
    """
    Create a new account.

    Steps:
      1. Check email uniqueness (Beanie find_one)
      2. Hash password with bcrypt
      3. Insert User document into MongoDB
      4. Return a signed JWT token + user profile
    """
    existing = await User.find_one(User.email == body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email           = body.email,
        full_name       = body.full_name,
        hashed_password = hash_password(body.password),
        specialty       = body.specialty,
    )
    await user.insert()
    logger.info("New user registered: %s", user.email)

    return TokenResponse(
        access_token = create_access_token(str(user.id)),
        user         = _to_profile(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """
    Authenticate with email + password.
    Returns 401 for both 'wrong email' and 'wrong password'
    (avoid leaking which half is incorrect).
    """
    user = await User.find_one(User.email == body.email)

    # FIX: Check is_active BEFORE running verify_password (bcrypt is expensive).
    # Previously, a deactivated account still triggered the full bcrypt comparison.
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    logger.info("User logged in: %s", user.email)
    return TokenResponse(
        access_token = create_access_token(str(user.id)),
        user         = _to_profile(user),
    )


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile. Used by the frontend on refresh."""
    return _to_profile(current_user)