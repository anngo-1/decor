from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class SpaceBase(BaseModel):
    title: str
    description: Optional[str] = None
    layout_data: Any
    preview_url: Optional[str] = None
    is_published: bool = False


class SpaceCreate(SpaceBase):
    pass


class SpaceUpdate(SpaceBase):
    title: Optional[str] = None
    layout_data: Optional[Any] = None


class Space(SpaceBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SpaceLayout(BaseModel):
    id: str
    layout_data: Any

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    id: str


class UserCreate(UserBase):
    pass


class User(UserBase):
    created_at: datetime

    class Config:
        from_attributes = True
