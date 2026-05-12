from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import RefreshToken, User
from app.db.models.game import GameParticipant, PlayerAnswer
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

    async def get_stats(self, user_id: uuid.UUID) -> dict:
        # 1. Tổng số game đã chơi
        q_total = select(func.count(GameParticipant.id)).where(GameParticipant.user_id == user_id)
        res_total = await self.session.execute(q_total)
        total_games = res_total.scalar() or 0

        # 2. Điểm trung bình và Thứ hạng tốt nhất
        q_avg_best = select(
            func.avg(GameParticipant.total_score),
            func.min(GameParticipant.rank)
        ).where(GameParticipant.user_id == user_id)
        res_avg_best = await self.session.execute(q_avg_best)
        avg_score, best_rank = res_avg_best.one()

        # 3. Tỉ lệ câu trả lời đúng
        # Join GameParticipant với PlayerAnswer để lấy answers của user này
        q_correct = select(
            func.count(PlayerAnswer.id).filter(PlayerAnswer.is_correct.is_(True)),
            func.count(PlayerAnswer.id)
        ).join(
            GameParticipant, PlayerAnswer.participant_id == GameParticipant.id
        ).where(GameParticipant.user_id == user_id)
        
        res_correct = await self.session.execute(q_correct)
        correct_count, total_answers = res_correct.one()

        correct_rate = (correct_count / total_answers * 100) if total_answers > 0 else 0.0

        return {
            "total_games_played": total_games,
            "avg_score": float(avg_score or 0),
            "correct_rate": float(correct_rate),
            "best_rank": best_rank
        }
