import csv
import io
import secrets
import string
from collections import Counter
from datetime import datetime, timedelta, timezone

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user
from app.url_safety import is_safe_redirect_target
from app.user_agents import parse_browser, parse_device

router = APIRouter(prefix="/links", tags=["Links"])

_ALPHABET = string.ascii_letters + string.digits


def generate_short_code(db: Session, length: int = 7) -> str:
    """Cryptographically random, collision-checked short code."""
    while True:
        code = "".join(secrets.choice(_ALPHABET) for _ in range(length))
        if not db.query(models.LinkModel).filter(models.LinkModel.short_code == code).first():
            return code


def _get_owned_link(link_id: int, db: Session, current_user: models.User) -> models.LinkModel:
    """Every private endpoint resolves links through this ownership guard."""
    link = (
        db.query(models.LinkModel)
        .filter(models.LinkModel.id == link_id, models.LinkModel.owner_id == current_user.id)
        .first()
    )
    if not link:
        # Same response whether missing or foreign — no existence leak.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    return link


@router.post("/", response_model=schemas.LinkResponse, status_code=status.HTTP_201_CREATED)
def create_link(
    link: schemas.LinkCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = str(link.target_url)
    if not is_safe_redirect_target(target):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only absolute http(s) URLs can be shortened",
        )

    if link.custom_slug:
        existing = db.query(models.LinkModel).filter(models.LinkModel.custom_slug == link.custom_slug).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom slug already taken")

    short_code = link.custom_slug if link.custom_slug else generate_short_code(db)

    new_db_link = models.LinkModel(
        target_url=target,
        title=link.title,
        short_code=short_code,
        custom_slug=link.custom_slug,
        clicks=0,
        expires_at=link.expires_at,
        owner_id=current_user.id,
    )

    db.add(new_db_link)
    db.commit()
    db.refresh(new_db_link)

    return new_db_link


@router.get("/", response_model=list[schemas.LinkResponse])
def list_links(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.LinkModel)
        .filter(models.LinkModel.owner_id == current_user.id)
        .order_by(models.LinkModel.created_at.desc())
        .all()
    )


@router.get("/{link_id}", response_model=schemas.LinkResponse)
def get_link(link_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return _get_owned_link(link_id, db, current_user)


@router.put("/{link_id}", response_model=schemas.LinkResponse)
def update_link(
    link_id: int,
    link_update: schemas.LinkCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    link = _get_owned_link(link_id, db, current_user)

    target = str(link_update.target_url)
    if not is_safe_redirect_target(target):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only absolute http(s) URLs can be shortened",
        )

    if link_update.custom_slug and link_update.custom_slug != link.custom_slug:
        existing = (
            db.query(models.LinkModel)
            .filter(
                models.LinkModel.custom_slug == link_update.custom_slug,
                models.LinkModel.id != link_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom slug already taken")
        link.short_code = link_update.custom_slug
        link.custom_slug = link_update.custom_slug

    link.target_url = target
    if link_update.title is not None:
        link.title = link_update.title
    link.expires_at = link_update.expires_at

    db.commit()
    db.refresh(link)
    return link


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    link = _get_owned_link(link_id, db, current_user)
    db.query(models.ClickAnalytics).filter(models.ClickAnalytics.link_id == link.id).delete()
    db.delete(link)
    db.commit()
    return None


@router.get("/{link_id}/qr")
def get_link_qr(link_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    link = _get_owned_link(link_id, db, current_user)

    qr = qrcode.make(link.target_url)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")


@router.get("/{link_id}/export")
def export_link_clicks(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """CSV export of the raw click stream — part of Link Intelligence."""
    link = _get_owned_link(link_id, db, current_user)

    clicks = (
        db.query(models.ClickAnalytics)
        .filter(models.ClickAnalytics.link_id == link.id)
        .order_by(models.ClickAnalytics.timestamp.desc())
        .all()
    )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["timestamp", "referrer", "device", "browser"])
    for c in clicks:
        writer.writerow(
            [
                c.timestamp.isoformat() if c.timestamp else "",
                c.referrer or "direct",
                parse_device(c.user_agent),
                parse_browser(c.user_agent),
            ]
        )
    buf.seek(0)

    filename = f"nexuslinks-{link.short_code}-clicks.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{link_id}/analytics", response_model=schemas.LinkAnalyticsResponse)
def get_link_analytics(
    link_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Aggregated Link Intelligence: referrers, devices, browsers,
    daily series and a weekday-hour heatmap."""
    link = _get_owned_link(link_id, db, current_user)
    days = max(1, min(days, 365))

    since = datetime.now(timezone.utc) - timedelta(days=days)
    clicks = (
        db.query(models.ClickAnalytics)
        .filter(models.ClickAnalytics.link_id == link.id, models.ClickAnalytics.timestamp >= since)
        .all()
    )

    referrer_counts: Counter = Counter()
    device_counts: Counter = Counter()
    browser_counts: Counter = Counter()
    daily_counts: Counter = Counter()
    heatmap: Counter = Counter()
    weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    for c in clicks:
        referrer_counts[c.referrer or "direct"] += 1
        device_counts[parse_device(c.user_agent)] += 1
        browser_counts[parse_browser(c.user_agent)] += 1

        ts = c.timestamp
        if ts is None:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        daily_counts[ts.date().isoformat()] += 1
        heatmap[f"{weekdays[ts.weekday()]}-{ts.hour}"] += 1

    # Fill the daily series so charts show zero-click days too
    daily_clicks = []
    for offset in range(days - 1, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=offset)).date().isoformat()
        daily_clicks.append({"date": day, "count": daily_counts.get(day, 0)})

    return schemas.LinkAnalyticsResponse(
        link=link,
        total_clicks=link.clicks,
        referrer_counts=dict(referrer_counts.most_common()),
        device_counts=dict(device_counts.most_common()),
        browser_counts=dict(browser_counts.most_common()),
        daily_clicks=daily_clicks,
        heatmap=dict(heatmap),
    )