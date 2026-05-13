from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserCreate


class RegisterRequest(UserCreate):
    password: str = Field(min_length=1)

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "player1@example.com",
                "username": "player1",
                "display_name": "Pro Player",
                "password": "securepassword123"
            }
        }
    }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "user@example.com",
                "password": "password123"
            }
        }
    }


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }
    }


class LogoutRequest(BaseModel):
    refresh_token: str
