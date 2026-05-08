import uuid
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.db.models.quiz import Quiz

from sqlalchemy import String, SmallInteger, Text, Boolean, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin

class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id:              Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id:         Mapped[uuid.UUID] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text:   Mapped[str]       = mapped_column(Text, nullable=False)
    question_type:   Mapped[str]       = mapped_column(String(20), default="multiple_choice", nullable=False)
    time_limit_secs: Mapped[int]       = mapped_column(SmallInteger, default=30, nullable=False)
    points:          Mapped[int]       = mapped_column(SmallInteger, default=100, nullable=False)
    order_index:     Mapped[int]       = mapped_column(SmallInteger, default=0, nullable=False)
    image_url:       Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("question_type IN ('multiple_choice', 'true_false')", name="chk_question_type"),
        CheckConstraint("time_limit_secs BETWEEN 5 AND 120", name="chk_time_limit"),
        CheckConstraint("points > 0", name="chk_points"),
        CheckConstraint("order_index >= 0", name="chk_order_index"),
        Index("idx_questions_quiz", "quiz_id", "order_index"),
    )

    quiz: Mapped["Quiz"] = relationship(back_populates="questions")
    options: Mapped[list["AnswerOption"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class AnswerOption(Base):
    __tablename__ = "answer_options"

    id:          Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    option_text: Mapped[str]       = mapped_column(Text, nullable=False)
    is_correct:  Mapped[bool]      = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int]       = mapped_column(SmallInteger, default=0, nullable=False)

    __table_args__ = (
        CheckConstraint("order_index >= 0", name="chk_option_order"),
        Index("idx_options_question", "question_id"),
    )

    question: Mapped["Question"] = relationship(back_populates="options")