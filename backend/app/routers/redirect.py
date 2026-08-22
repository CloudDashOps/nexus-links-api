from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.url_safety import is_safe_redirect_target

router = APIRouter(tags=["Routing"])


@router.get("/{short_code}")
def redirect_to_target(short_code: str, request: Request, db: Session = Depends(get_db)):
    link = db.query(models.LinkModel).filter(models.LinkModel.short_code == short_code).first()

    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found")

    # Never redirect to non-http(s) targets (blocks javascript:/data: injection)
    if not is_safe_redirect_target(link.target_url):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link target is not a safe URL")

    # Check expiration using timezone-aware UTC comparison
    if link.expires_at is not None:
        expires_at = link.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="Link has expired")

    # Increment clicks synchronously before redirect
    link.clicks += 1

    # Record click analytics
    referrer = request.headers.get("referer")
    user_agent = request.headers.get("user-agent")
    click = models.ClickAnalytics(
        link_id=link.id,
        referrer=referrer,
        user_agent=user_agent,
    )
    db.add(click)
    db.commit()

    return RedirectResponse(url=link.target_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
