from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean, Enum, DECIMAL, BigInteger, SmallInteger
from sqlalchemy.dialects.mysql import LONGTEXT, MEDIUMTEXT
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum as PythonEnum


class UserRole(str, PythonEnum):
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class PostStatus(str, PythonEnum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class EventType(str, PythonEnum):
    PAGE_VIEW = "page_view"
    CLICK = "click"
    SHARE = "share"


class DeviceType(str, PythonEnum):
    DESKTOP = "desktop"
    TABLET = "tablet"
    MOBILE = "mobile"


class MediaKind(str, PythonEnum):
    IMAGE = "image"
    VIDEO = "video"
    FILE = "file"
    ICON = "icon"


# Base Models for common patterns
class TimestampMixin(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: Optional[datetime] = Field(default=None)


# Create/Update schemas for AdminUser (needed for the init_db function)
class AdminUserCreate(SQLModel):
    email: str
    password: str
    full_name: str
    role: UserRole = UserRole.ADMIN
    tenant_id: int


class AdminUserUpdate(SQLModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
