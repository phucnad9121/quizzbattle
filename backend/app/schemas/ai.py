from pydantic import BaseModel, Field
from typing import List, Literal
from app.schemas.question import QuestionCreate

class AIGenerationRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=100)
    num_questions: int = Field(5, ge=1, le=15)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    language: str = Field("Vietnamese", description="Language of the questions")

class AIGenerationResponse(BaseModel):
    questions: List[QuestionCreate]
    usage: dict = Field(default_factory=dict, description="Token usage information")
