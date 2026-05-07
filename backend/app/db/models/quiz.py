# app/db/models/quiz.py
import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin

class Quiz(Base, TimestampMixin):
    __tablename__ = "quizzes"

    id:          Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id:    Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title:       Mapped[str]       = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url:   Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public:   Mapped[bool]      = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("idx_quizzes_owner", "owner_id"),
        Index("idx_quizzes_public", "is_public", postgresql_where=(is_public == True)),
    )

    owner: Mapped["User"] = relationship()
    questions: Mapped[list["Question"]] = relationship(back_populates="quiz", cascade="all, delete-orphan")
