from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserCreate


class RegisterRequest(UserCreate):
    password: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: str
