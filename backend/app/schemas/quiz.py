from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.question import QuestionResponse

class QuizBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    cover_url: str | None = None
    is_public: bool = False

class QuizCreate(QuizBase):
    pass

class QuizUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    cover_url: str | None = None
    is_public: bool | None = None

class QuizResponse(QuizBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    question_count: int
    created_at: datetime

class QuizListResponse(BaseModel):
    items: list[QuizResponse]
    total: int
    page: int
    size: int

class QuizDetailResponse(QuizResponse):
    questions: list[QuestionResponse]
