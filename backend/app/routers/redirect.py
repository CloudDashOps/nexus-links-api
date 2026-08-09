from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app import models

router = APIRouter(tags=["Routing"])


@router.get("/{short_code}")
def redirect_to_target(short_code: str, request: Request, db: Session = Depends(get_db)):
    link = db.query(models.LinkModel).filter(models.LinkModel.short_code == short_code).first()

    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found")

    # Check expiration only if expires_at is set — use timezone-aware UTC comparison
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
        user_agent=user_agent
    )
    db.add(click)
    db.commit()

    return RedirectResponse(url=link.target_url)
