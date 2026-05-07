from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, hash_password, hash_refresh_token, verify_password
from app.repositories.user_repo import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserCreate
from app.db.models.user import User


async def register_user(session: AsyncSession, data: RegisterRequest) -> User:
    repo = UserRepository(session)

    if await repo.exists_email(data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    if await repo.exists_username(data.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    hashed_password = hash_password(data.password)
    user_in = UserCreate(**data.model_dump(exclude={"password"}))
    return await repo.create(user_in, hashed_password=hashed_password)


async def login_user(session: AsyncSession, data: LoginRequest) -> TokenResponse:
    repo = UserRepository(session)

    user = await repo.get_by_email(data.email)
    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    access_token = create_access_token(user.id, user.username)
    raw_refresh_token, refresh_token_hash, expires_at = create_refresh_token()

    await repo.save_refresh_token(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=expires_at,
    )

    return TokenResponse(access_token=access_token, refresh_token=raw_refresh_token)


async def refresh_tokens(session: AsyncSession, raw_refresh_token: str) -> TokenResponse:
    repo = UserRepository(session)
    token_hash = hash_refresh_token(raw_refresh_token)

    existing_any = await repo.get_refresh_token_any(token_hash)
    if existing_any is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if existing_any.revoked:
        await repo.revoke_all_user_tokens(existing_any.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked",
        )

    valid_token = await repo.get_refresh_token(token_hash)
    if valid_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    user = await repo.get_by_id(valid_token.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    await repo.revoke_all_user_tokens(user.id)

    access_token = create_access_token(user.id, user.username)
    new_raw, new_hash, expires_at = create_refresh_token()
    await repo.save_refresh_token(
        user_id=user.id,
        token_hash=new_hash,
        expires_at=expires_at,
    )

    return TokenResponse(access_token=access_token, refresh_token=new_raw)


async def logout_user(session: AsyncSession, user_id: str, raw_refresh_token: str) -> None:
    repo = UserRepository(session)
    token_hash = hash_refresh_token(raw_refresh_token)
    token = await repo.get_refresh_token_any(token_hash)
    if token is None or str(token.user_id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if token.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked",
        )

    await repo.revoke_refresh_token(token_hash)
