import re

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator
from datetime import datetime
from typing import Optional

# Custom slugs: letters, digits and dashes only so they are URL-safe
SLUG_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9-]{2,49}$")


class LinkBase(BaseModel):
    target_url: HttpUrl
    title: Optional[str] = Field(default=None, max_length=200)


class LinkCreate(LinkBase):
    custom_slug: Optional[str] = None
    expires_at: Optional[datetime] = None

    @field_validator("custom_slug")
    @classmethod
    def validate_custom_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not SLUG_PATTERN.match(v):
            raise ValueError(
                "Custom slug must be 3-50 characters, alphanumeric or dashes, "
                "and start with a letter or digit."
            )
        return v

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if isinstance(v, str) else v


class LinkResponse(LinkBase):
    id: int
    short_code: str
    custom_slug: Optional[str] = None
    clicks: int
    expires_at: Optional[datetime] = None
    created_at: datetime
    owner_id: Optional[int] = None

    model_config = {"from_attributes": True}


class DailyClick(BaseModel):
    date: str
    count: int


class LinkAnalyticsResponse(BaseModel):
    link: LinkResponse
    total_clicks: int
    referrer_counts: dict
    device_counts: dict
    browser_counts: dict
    daily_clicks: list[DailyClick]
    # Sparse map of "<weekday>-<hour>" -> click count, e.g. "Mon-13": 42
    heatmap: dict


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number.")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str