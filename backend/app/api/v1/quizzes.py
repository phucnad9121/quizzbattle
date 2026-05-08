import uuid
from fastapi import APIRouter, Depends, status, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user, get_db, PaginationParams, paginate, get_optional_user
from app.schemas.quiz import QuizCreate, QuizUpdate, QuizResponse, QuizListResponse, QuizDetailResponse
from app.repositories.quiz_repo import QuizRepository
from app.db.models.user import User

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

@router.get("", response_model=QuizListResponse)
async def get_quizzes(
    pagination: PaginationParams = Depends(paginate),
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(session)
    items, total = await repo.get_by_owner(user_id=current_user.id, page=pagination.page, size=pagination.size)
    return {
        "items": items,
        "total": total,
        "page": pagination.page,
        "size": pagination.size
    }

@router.get("/{id}", response_model=QuizDetailResponse)
async def get_quiz(
    id: uuid.UUID,
    current_user: User | None = Depends(get_optional_user),
    session: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(session)
    quiz = await repo.get_detail(id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    is_owner = current_user is not None and quiz.owner_id == current_user.id
    if not quiz.is_public and not is_owner:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    response = QuizDetailResponse.model_validate(quiz)
    
    # Hide is_correct from non-owners
    if not is_owner:
        for q in response.questions:
            for opt in q.options:
                opt.is_correct = None
                
    return response

@router.patch("/{id}", response_model=QuizResponse)
async def update_quiz(
    id: uuid.UUID,
    data: QuizUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(session)
    quiz = await repo.get_by_id(id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        quiz = await repo.update(id, update_data)
        await session.commit()
        await session.refresh(quiz, ["questions"]) # To ensure question_count property works
        
    return quiz

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(session)
    quiz = await repo.get_by_id(id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    await repo.delete(id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
