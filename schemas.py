from pydantic import BaseModel, HttpUrl
from datetime import datetime
from typing import Optional

# 1. The Base Schema (Shared properties)
class LinkBase(BaseModel):
    target_url: HttpUrl  # Validates that it's an actual URL (e.g., http://...)
    title: Optional[str] = None # Title is optional!

# 2. The Create Schema (What the user SENDS to us)
class LinkCreate(LinkBase):
    pass # Inherits everything from LinkBase. User only needs to send target_url and title.

# 3. The Response Schema (What we RETURN to the user)
class LinkResponse(LinkBase):
    id: int
    short_code: str
    clicks: int
    created_at: datetime

    # This tells Pydantic to read data directly from the SQLAlchemy database model
    model_config = {"from_attributes": True}