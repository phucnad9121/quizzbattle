# app/db/models/game.py
import uuid
from datetime import datetime
from sqlalchemy import String, SmallInteger, Integer, Boolean, ForeignKey, Index, CheckConstraint, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, CreatedMixin

class GameSession(Base, CreatedMixin):
    __tablename__ = "game_sessions"

    id:                   Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id:              Mapped[uuid.UUID] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    host_id:              Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    room_code:            Mapped[str]       = mapped_column(String(6), unique=True, nullable=False)
    status:               Mapped[str]       = mapped_column(String(20), default="waiting", nullable=False)
    current_question_idx: Mapped[int]       = mapped_column(SmallInteger, default=-1, nullable=False)
    started_at:           Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    finished_at:          Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('waiting', 'in_progress', 'finished')", name="chk_session_status"),
        Index("idx_sessions_host", "host_id"),
        Index("idx_sessions_active", text("status"), text("created_at DESC"), postgresql_where=text("status IN ('waiting', 'in_progress')")),
    )


class GameParticipant(Base):
    __tablename__ = "game_participants"

    id:           Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id:   Mapped[uuid.UUID] = mapped_column(ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id:      Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    display_name: Mapped[str]       = mapped_column(String(50), nullable=False)
    total_score:  Mapped[int]       = mapped_column(Integer, default=0, nullable=False)
    rank:         Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    joined_at:    Mapped[datetime]  = mapped_column(TIMESTAMP(timezone=True), server_default="now()", nullable=False)

    __table_args__ = (
        Index("idx_participants_session", "session_id"),
        Index("idx_participants_user_session", "session_id", "user_id", unique=True, postgresql_where=text("user_id IS NOT NULL")),
        Index("idx_participants_guest_name", "session_id", "display_name", unique=True),
    )


class PlayerAnswer(Base):
    __tablename__ = "player_answers"

    id:              Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id:  Mapped[uuid.UUID] = mapped_column(ForeignKey("game_participants.id", ondelete="CASCADE"), nullable=False)
    question_id:     Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"), nullable=False)
    selected_option: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("answer_options.id"), nullable=True)
    is_correct:      Mapped[bool]      = mapped_column(Boolean, default=False, nullable=False)
    score_earned:    Mapped[int]       = mapped_column(Integer, default=0, nullable=False)
    answer_time_ms:  Mapped[int]       = mapped_column(Integer, default=0, nullable=False)
    answered_at:     Mapped[datetime]  = mapped_column(TIMESTAMP(timezone=True), server_default="now()", nullable=False)

    __table_args__ = (
        UniqueConstraint("participant_id", "question_id", name="uq_player_answers_participant_question"),
        Index("idx_answers_participant", "participant_id"),
        Index("idx_answers_question", "question_id"),
    )