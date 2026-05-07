# app/db/models/game.py
from datetime import datetime
from typing import Literal
from sqlalchemy import String, ForeignKey, SmallInteger, Integer, Boolean
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, CreatedMixin   # [C-04] GameSession dùng CreatedMixin, không phải TimestampMixin
import uuid

# [W-02] Dùng Literal thay Enum DB — validation ở tầng Pydantic
GameStatusType = Literal['waiting', 'in_progress', 'finished']

class GameSession(Base, CreatedMixin):   # [C-04] CreatedMixin: chỉ có created_at
    __tablename__ = "game_sessions"

    id:                   Mapped[uuid.UUID]      = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id:              Mapped[uuid.UUID]       = mapped_column(ForeignKey("quizzes.id"))
    host_id:              Mapped[uuid.UUID]       = mapped_column(ForeignKey("users.id"))
    room_code:            Mapped[str]             = mapped_column(String(6), index=True)  # [C-01] String(6) → VARCHAR(6)
    status:               Mapped[str]             = mapped_column(String(20), default="waiting")  # [W-02] String thay PgEnum
    current_question_idx: Mapped[int]             = mapped_column(SmallInteger, default=-1)
    started_at:           Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))   # [C-04] thêm đủ 2 field
    finished_at:          Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    participants: Mapped[list["GameParticipant"]] = relationship(back_populates="session")


class GameParticipant(Base, CreatedMixin):
    __tablename__ = "game_participants"

    id:           Mapped[uuid.UUID]      = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id:   Mapped[uuid.UUID]       = mapped_column(ForeignKey("game_sessions.id", ondelete="CASCADE"))
    user_id:      Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    display_name: Mapped[str]             = mapped_column(String(50))
    total_score:  Mapped[int]             = mapped_column(Integer, default=0)
    rank:         Mapped[int | None]      = mapped_column(SmallInteger)
    joined_at:    Mapped[datetime]        = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    session: Mapped["GameSession"]           = relationship(back_populates="participants")
    answers: Mapped[list["PlayerAnswer"]]    = relationship(back_populates="participant")


class PlayerAnswer(Base, CreatedMixin):
    __tablename__ = "player_answers"

    id:              Mapped[uuid.UUID]       = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id:  Mapped[uuid.UUID]        = mapped_column(ForeignKey("game_participants.id", ondelete="CASCADE"))
    question_id:     Mapped[uuid.UUID]        = mapped_column(ForeignKey("questions.id"))
    selected_option: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("answer_options.id"), nullable=True)
    is_correct:      Mapped[bool]             = mapped_column(Boolean, default=False)
    score_earned:    Mapped[int]              = mapped_column(Integer, default=0)   # [W-03] Integer thay SmallInt
    answer_time_ms:  Mapped[int]              = mapped_column(Integer, default=0)
    answered_at:     Mapped[datetime]         = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    participant: Mapped["GameParticipant"] = relationship(back_populates="answers")