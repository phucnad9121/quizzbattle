from __future__ import annotations
import uuid
from typing import TypeAlias

from fastapi import Depends, Header, HTTPException, status, Query, WebSocket, Path
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

async def get_pagination_params(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> PaginationParams:
    return PaginationParams(page=page, size=size)

# Backward-compatible alias for existing imports
async def paginate(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> PaginationParams:
    return PaginationParams(page=page, size=size)

async def get_current_user_ws(
    websocket: WebSocket,
    token: str | None = Query(None),
    session: AsyncSession = Depends(get_db),
) -> User | None:
    if not token:
        await websocket.close(code=4001)
        return None
    try:
        token_data = decode_access_token(token)
        repo = UserRepository(session)
        user = await repo.get_by_id(uuid.UUID(token_data.user_id))
        if not user:
            await websocket.close(code=4001)
            return None
        return user
    except Exception:
        await websocket.close(code=4001)
        return None

from app.db.models.game import GameSession
from sqlalchemy import select

async def get_room_ws(
    websocket: WebSocket,
    room_code: str = Path(...),
    session: AsyncSession = Depends(get_db),
) -> GameSession | None:
    result = await session.execute(
        select(GameSession).where(GameSession.room_code == room_code.upper())
    )
    room = result.scalar_one_or_none()
    if not room:
        await websocket.close(code=4004)
        return None
    return room
