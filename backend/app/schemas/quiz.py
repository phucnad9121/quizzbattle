from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.question import QuestionResponse

class QuizBase(BaseModel):
    title: str = Field(..., max_length=200, description="Tiêu đề của bộ câu hỏi")
    description: str | None = Field(None, description="Mô tả chi tiết")
    cover_url: str | None = Field(None, description="URL ảnh bìa")
    is_public: bool = Field(False, description="Trạng thái công khai")

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Lịch sử Việt Nam",
                "description": "Tìm hiểu về các triều đại phong kiến",
                "cover_url": "https://example.com/cover.jpg",
                "is_public": True
            }
        }
    }

class QuizCreate(QuizBase):
    pass

class QuizUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    cover_url: str | None = None
    is_public: bool | None = None

class QuizResponse(QuizBase):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "0768946c-205a-4f65-8205-7159500e44be",
                "title": "Lịch sử Việt Nam",
                "description": "Tìm hiểu về các triều đại phong kiến",
                "cover_url": "https://example.com/cover.jpg",
                "is_public": True,
                "owner_id": "93ec90c1-c389-4e03-bd30-5db9c3f4fda6",
                "question_count": 10,
                "created_at": "2026-05-13T16:18:15"
            }
        }
    )

    id: uuid.UUID
    owner_id: uuid.UUID
    question_count: int
    created_at: datetime

class QuizListResponse(BaseModel):
    items: list[QuizResponse]
    total: int
    page: int
    size: int

    model_config = {
        "json_schema_extra": {
            "example": {
                "items": [],
                "total": 0,
                "page": 1,
                "size": 20
            }
        }
    }

class QuizDetailResponse(QuizResponse):
    questions: list[QuestionResponse]
