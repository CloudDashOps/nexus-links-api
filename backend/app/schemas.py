from pydantic import BaseModel, HttpUrl, EmailStr
from datetime import datetime
from typing import Optional


class LinkBase(BaseModel):
    target_url: HttpUrl
    title: Optional[str] = None


class LinkCreate(LinkBase):
    custom_slug: Optional[str] = None
    expires_at: Optional[datetime] = None


class LinkResponse(LinkBase):
    id: int
    short_code: str
    custom_slug: Optional[str] = None
    clicks: int
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClickAnalyticsResponse(BaseModel):
    id: int
    link_id: int
    timestamp: datetime
    referrer: Optional[str] = None
    user_agent: Optional[str] = None

    model_config = {"from_attributes": True}


class LinkAnalyticsResponse(BaseModel):
    link: LinkResponse
    total_clicks: int
    referrer_counts: dict


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


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