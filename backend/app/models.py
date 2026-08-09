from sqlalchemy import Column, Integer, String, DateTime, Index, ForeignKey, Boolean
from datetime import datetime
from app.database import Base


class LinkModel(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, index=True)
    target_url = Column(String, nullable=False)
    short_code = Column(String, unique=True, index=True, nullable=False)
    custom_slug = Column(String, unique=True, index=True, nullable=True)
    title = Column(String, nullable=True)
    clicks = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_short_code', 'short_code'),
        Index('idx_custom_slug', 'custom_slug'),
    )


class ClickAnalytics(Base):
    __tablename__ = "click_analytics"

    id = Column(Integer, primary_key=True, index=True)
    link_id = Column(Integer, ForeignKey("links.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    referrer = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)