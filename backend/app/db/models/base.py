# app/db/models/base.py
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import TIMESTAMP

# [C-04] Tách thành 2 mixin riêng — không phải bảng nào cũng cần updated_at
class CreatedMixin:
    """Chỉ created_at — dùng cho GameSession, RefreshToken, PlayerAnswer."""
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

class TimestampMixin(CreatedMixin):
    """created_at + updated_at — dùng cho User, Quiz, Question."""
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

class Base(DeclarativeBase):
    pass