from sqlalchemy import Column, String, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Guest Hash
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Space(Base):
    __tablename__ = "spaces"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String, nullable=True)
    layout_data = Column(JSON) # Walls, Items, Height, etc.
    preview_url = Column(String, nullable=True) # Screenshot data URL
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
