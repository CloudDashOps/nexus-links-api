from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models
from app import schemas
from app.security import get_current_user
import random
import string
import io
import qrcode

router = APIRouter(prefix="/links", tags=["Links"])


def generate_short_code(db: Session) -> str:
    chars = string.ascii_letters + string.digits
    while True:
        code = "".join(random.choices(chars, k=6))
        if not db.query(models.LinkModel).filter(models.LinkModel.short_code == code).first():
            return code


@router.post("/", response_model=schemas.LinkResponse, status_code=status.HTTP_201_CREATED)
def create_link(link: schemas.LinkCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check custom slug uniqueness if provided
    if link.custom_slug:
        existing = db.query(models.LinkModel).filter(models.LinkModel.custom_slug == link.custom_slug).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom slug already taken")

    short_code = link.custom_slug if link.custom_slug else generate_short_code(db)

    new_db_link = models.LinkModel(
        target_url=str(link.target_url),
        title=link.title,
        short_code=short_code,
        custom_slug=link.custom_slug,
        clicks=0,
        expires_at=link.expires_at
    )

    db.add(new_db_link)
    db.commit()
    db.refresh(new_db_link)

    return new_db_link


@router.get("/", response_model=list[schemas.LinkResponse])
def list_links(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    links = db.query(models.LinkModel).all()
    return links


@router.get("/{link_id}", response_model=schemas.LinkResponse)
def get_link(link_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    link = db.query(models.LinkModel).filter(models.LinkModel.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    return link


@router.put("/{link_id}", response_model=schemas.LinkResponse)
def update_link(link_id: int, link_update: schemas.LinkCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    link = db.query(models.LinkModel).filter(models.LinkModel.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    if link_update.custom_slug and link_update.custom_slug != link.custom_slug:
        existing = db.query(models.LinkModel).filter(
            models.LinkModel.custom_slug == link_update.custom_slug,
            models.LinkModel.id != link_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom slug already taken")
        link.short_code = link_update.custom_slug
        link.custom_slug = link_update.custom_slug

    link.target_url = str(link_update.target_url)
    if link_update.title is not None:
        link.title = link_update.title
    link.expires_at = link_update.expires_at

    db.commit()
    db.refresh(link)
    return link


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    link = db.query(models.LinkModel).filter(models.LinkModel.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    db.delete(link)
    db.commit()
    return None


@router.get("/{link_id}/qr")
def get_link_qr(link_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    link = db.query(models.LinkModel).filter(models.LinkModel.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    qr = qrcode.make(link.target_url)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")


@router.get("/{link_id}/analytics", response_model=schemas.LinkAnalyticsResponse)
def get_link_analytics(link_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    link = db.query(models.LinkModel).filter(models.LinkModel.id == link_id).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    clicks = db.query(models.ClickAnalytics).filter(models.ClickAnalytics.link_id == link_id).all()

    referrer_counts = {}
    for c in clicks:
        ref = c.referrer or "direct"
        referrer_counts[ref] = referrer_counts.get(ref, 0) + 1

    return schemas.LinkAnalyticsResponse(
        link=link,
        total_clicks=link.clicks,
        referrer_counts=referrer_counts
    )