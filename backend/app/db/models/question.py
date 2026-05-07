# app/db/models/question.py  (ví dụ cho question_type dùng String)
from sqlalchemy import String, SmallInteger, Text, Boolean
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin   # Question cần updated_at → dùng TimestampMixin
import uuid

class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id:              Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id:         Mapped[uuid.UUID] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"))
    question_text:   Mapped[str]       = mapped_column(Text)
    question_type:   Mapped[str]       = mapped_column(String(20), default="multiple_choice")  # [W-02]
    time_limit_secs: Mapped[int]       = mapped_column(SmallInteger, default=30)
    points:          Mapped[int]       = mapped_column(SmallInteger, default=100)
    order_index:     Mapped[int]       = mapped_column(SmallInteger, default=0)
    image_url:       Mapped[str | None] = mapped_column(Text, nullable=True)

    options: Mapped[list["AnswerOption"]] = relationship(back_populates="question", cascade="all, delete-orphan")