from sqlalchemy import Column, Integer, String, DateTime, Index
from datetime import datetime
from database import Base

class LinkModel(Base):
    __tablename__ = "links"

    # Define table columns
    id = Column(Integer, primary_key=True, index=True)
    target_url = Column(String, nullable=False)
    short_code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    clicks = Column(Integer, default=0) # Tracks how many times it was used
    created_at = Column(DateTime, default=datetime.utcnow)

    # Database Index optimization explicitly stated
    __table_args__ = (
        Index('idx_short_code', 'short_code'),
    )