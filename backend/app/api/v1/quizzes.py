from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user, get_db
from app.schemas.quiz import QuizCreate, QuizResponse
from app.repositories.quiz_repo import QuizRepository

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

@router.post("", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    data: QuizCreate,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(session)
    quiz = await repo.create(owner_id=current_user.id, data=data.model_dump())
    await session.commit()
    await session.refresh(quiz, ["questions"]) # To ensure question_count property works
    return quiz
