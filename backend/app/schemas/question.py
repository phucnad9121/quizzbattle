from pydantic import BaseModel, ConfigDict, Field, model_validator
import uuid
from typing import Optional, Literal

class OptionCreate(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False

class QuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: Literal["multiple_choice", "true_false"]
    time_limit_secs: int = Field(30, ge=5, le=120)
    points: int = Field(100, ge=1)
    image_url: Optional[str] = None
    options: list[OptionCreate]

    model_config = {
        "json_schema_extra": {
            "example": {
                "question_text": "Ai là người sáng lập ra nhà Trần?",
                "question_type": "multiple_choice",
                "time_limit_secs": 30,
                "points": 100,
                "options": [
                    {"option_text": "Trần Thái Tông", "is_correct": True},
                    {"option_text": "Trần Hưng Đạo", "is_correct": False},
                    {"option_text": "Trần Quốc Toản", "is_correct": False},
                    {"option_text": "Trần Quang Khải", "is_correct": False}
                ]
            }
        }
    }

    @model_validator(mode='after')
    def validate_options(self) -> 'QuestionCreate':
        correct_count = sum(1 for opt in self.options if opt.is_correct)
        
        if self.question_type == "multiple_choice":
            if not (2 <= len(self.options) <= 4):
                raise ValueError("multiple_choice must have 2 to 4 options")
            if correct_count != 1:
                raise ValueError("multiple_choice must have exactly 1 correct option")
                
        elif self.question_type == "true_false":
            if len(self.options) != 2:
                raise ValueError("true_false must have exactly 2 options")
            if correct_count != 1:
                raise ValueError("true_false must have exactly 1 correct option")
            
            # Ensure options are "Đúng" and "Sai" (case-insensitive for validation)
            texts = {opt.option_text.strip().lower() for opt in self.options}
            if texts != {"đúng", "sai"}:
                raise ValueError('true_false options must be "Đúng" and "Sai"')
                
        return self

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = Field(None, min_length=1)
    question_type: Optional[Literal["multiple_choice", "true_false"]] = None
    time_limit_secs: Optional[int] = Field(None, ge=5, le=120)
    points: Optional[int] = Field(None, ge=1)
    image_url: Optional[str] = None
    options: Optional[list[OptionCreate]] = None

class ReorderQuestionsRequest(BaseModel):
    question_ids: list[uuid.UUID]

class OptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    option_text: str
    order_index: int
    is_correct: Optional[bool] = None

class QuestionResponse(BaseModel):
    image_url: Optional[str] = None
    options: list[OptionResponse]

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "e44be076-8946-4f65-8205-715950071595",
                "question_text": "Ai là người sáng lập ra nhà Trần?",
                "question_type": "multiple_choice",
                "time_limit_secs": 30,
                "points": 100,
                "order_index": 0,
                "options": [
                    {"id": "uuid-1", "option_text": "Trần Thái Tông", "order_index": 0, "is_correct": True},
                    {"id": "uuid-2", "option_text": "Trần Hưng Đạo", "order_index": 1, "is_correct": False}
                ]
            }
        }
    )
