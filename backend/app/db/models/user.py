# backend/app/db/models/user.py
import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin, CreatedMixin
from datetime import datetime

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id:              Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username:        Mapped[str]       = mapped_column(String(50), unique=True, nullable=False)
    email:           Mapped[str]       = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str]       = mapped_column(Text, nullable=False)
    avatar_url:      Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active:       Mapped[bool]      = mapped_column(Boolean, default=True, nullable=False)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

class RefreshToken(Base, CreatedMixin):
    __tablename__ = "refresh_tokens"

    id:         Mapped[uuid.UUID]  = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id:    Mapped[uuid.UUID]  = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str]        = mapped_column(Text, unique=True, nullable=False)
    expires_at: Mapped[datetime]   = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    revoked:    Mapped[bool]       = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")