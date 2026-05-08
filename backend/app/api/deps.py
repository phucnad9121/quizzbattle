from __future__ import annotations
import uuid
from typing import TypeAlias

from fastapi import Depends, Header, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.security import decode_access_token
from app.db.models.user import User
from app.db.session import get_db
from app.repositories.user_repo import UserRepository


CurrentUser: TypeAlias = User


async def get_current_user(
    session: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token",
        )

    try:
        token_data = decode_access_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    repo = UserRepository(session)
    user = await repo.get_by_id(uuid.UUID(token_data.user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    return user

async def get_optional_user(
    session: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None

    try:
        token_data = decode_access_token(token)
    except ValueError:
        return None

    repo = UserRepository(session)
    user = await repo.get_by_id(uuid.UUID(token_data.user_id))
    return user


class PaginationParams(BaseModel):
    page: int
    size: int

async def paginate(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page")
) -> PaginationParams:
    return PaginationParams(page=page, size=size)
