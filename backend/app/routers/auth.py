from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.ratelimit import RateLimiter
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# 10 auth attempts per IP per 5 minutes — blunts credential stuffing.
auth_limiter = RateLimiter(max_events=10, window_seconds=300)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit(request: Request) -> None:
    """Reject the request outright once this IP has burned its quota.

    Only *failed* attempts are recorded (see callers), so normal
    successful signups/logins never consume the budget.
    """
    if not auth_limiter.check(_client_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later.",
        )


def _record_failure(request: Request) -> None:
    """Charge a failed attempt against the IP's rate-limit budget."""
    auth_limiter.record(_client_ip(request))


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    _rate_limit(request)

    existing = db.query(models.User).filter(models.User.email == user.email.lower()).first()
    if existing:
        _record_failure(request)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    hashed = hash_password(user.password)
    db_user = models.User(username=user.username, email=user.email.lower(), hashed_password=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    token = create_access_token({"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
def login(request: Request, user: schemas.UserLogin, db: Session = Depends(get_db)):
    _rate_limit(request)

    db_user = db.query(models.User).filter(models.User.email == user.email.lower()).first()
    # Same error for unknown email and wrong password — no user enumeration.
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        _record_failure(request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/users/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user