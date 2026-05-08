from pydantic import BaseModel, ConfigDict
import uuid
from typing import Optional

class OptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    option_text: str
    order_index: int
    is_correct: Optional[bool] = None

class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    question_text: str
    question_type: str
    time_limit_secs: int
    points: int
    order_index: int
    image_url: Optional[str] = None
    options: list[OptionResponse]
