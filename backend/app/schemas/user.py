from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

USERNAME_PATTERN = r"^[a-zA-Z0-9_]+$"


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=USERNAME_PATTERN)
    email: EmailStr
    avatar_url: str | None = None

    @field_validator("email", "username", mode="before")
    @classmethod
    def normalize_identity(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.lower()


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50, pattern=USERNAME_PATTERN)
    email: EmailStr | None = None
    avatar_url: str | None = None
    is_active: bool | None = None

    @field_validator("email", "username", mode="before")
    @classmethod
    def normalize_identity(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.lower()


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    avatar_url: str | None


class UserResponse(UserPublic):
    model_config = ConfigDict(from_attributes=True)

    email: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
