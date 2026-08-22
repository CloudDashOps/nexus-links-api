from sqlalchemy import Column, Integer, String, DateTime, Index, ForeignKey, Boolean
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Boolean

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LinkModel(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, index=True)
    target_url = Column(String(2048), nullable=False)
    short_code = Column(String(100), unique=True, index=True, nullable=False)
    custom_slug = Column(String(100), unique=True, index=True, nullable=True)
    title = Column(String(200), nullable=True)
    clicks = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Ownership — links created before this column existed have NULL owner
    # and remain visible only to nobody (legacy data); new links are scoped.
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    __table_args__ = (
        Index("idx_links_owner", "owner_id"),
        Index("idx_short_code", "short_code"),
        Index("idx_custom_slug", "custom_slug"),
    )


class ClickAnalytics(Base):
    __tablename__ = "click_analytics"

    id = Column(Integer, primary_key=True, index=True)
    link_id = Column(Integer, ForeignKey("links.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    referrer = Column(String(2048), nullable=True)
    user_agent = Column(String, nullable=True)