from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import RefreshToken, User
from app.repositories.base import BaseRepository
from app.schemas.user import UserCreate


class UserRepository(BaseRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def create(self, user_in: UserCreate, *, hashed_password: str) -> User:
        user = User(
            username=user_in.username,
            email=user_in.email,
            hashed_password=hashed_password,
            avatar_url=user_in.avatar_url,
            is_active=True,
        )
        self.session.add(user)
        await self.session.flush()
        return user

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(func.lower(User.email) == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.session.execute(
            select(User).where(func.lower(User.username) == username.lower())
        )
        return result.scalar_one_or_none()

    async def exists_email(self, email: str) -> bool:
        result = await self.session.execute(
            select(User.id).where(func.lower(User.email) == email.lower())
        )
        return result.scalar_one_or_none() is not None

    async def exists_username(self, username: str) -> bool:
        result = await self.session.execute(
            select(User.id).where(func.lower(User.username) == username.lower())
        )
        return result.scalar_one_or_none() is not None

    async def set_active(self, user: User, *, is_active: bool) -> User:
        user.is_active = is_active
        await self.session.flush()
        return user

    async def save_refresh_token(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        revoked: bool = False,
    ) -> RefreshToken:
        refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            revoked=revoked,
        )
        self.session.add(refresh_token)
        await self.session.flush()
        return refresh_token

    async def get_refresh_token(self, token_hash: str) -> RefreshToken | None:
        now = datetime.now(timezone.utc)
        result = await self.session.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked.is_(False),
                RefreshToken.expires_at > now,
            )
        )
        return result.scalar_one_or_none()

    async def get_refresh_token_any(self, token_hash: str) -> RefreshToken | None:
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token_hash: str) -> RefreshToken | None:
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        refresh_token = result.scalar_one_or_none()
        if refresh_token is None:
            return None
        refresh_token.revoked = True
        await self.session.flush()
        return refresh_token

    async def revoke_all_user_tokens(self, user_id: uuid.UUID) -> int:
        result = await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
            .values(revoked=True)
        )
        await self.session.flush()
        return result.rowcount or 0
