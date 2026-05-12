import uuid
from fastapi import APIRouter, Depends, status, HTTPException, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user, get_db, PaginationParams, paginate, get_optional_user
from app.schemas.quiz import QuizCreate, QuizUpdate, QuizResponse, QuizListResponse, QuizDetailResponse
from app.schemas.question import QuestionCreate, QuestionResponse, ReorderQuestionsRequest
from app.repositories.quiz_repo import QuizRepository, QuestionRepository
from app.db.models.user import User

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

@router.get("/public", response_model=QuizListResponse)
async def get_public_quizzes(
    search: str | None = Query(None),
    sort: str = Query("newest"),
    pagination: PaginationParams = Depends(paginate),
    session: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(session)
    items, total = await repo.get_public(
        page=pagination.page, 
        size=pagination.size, 
        search=search, 
        sort=sort
    )
    return {
        "items": items,
        "total": total,
        "page": pagination.page,
        "size": pagination.size
    }

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

@router.post("/{id}/fork", response_model=QuizResponse)
async def fork_quiz(
    id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(session)
    forked = await repo.fork(id, current_user.id)
    if not forked:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    await session.commit()
    await session.refresh(forked, ["questions"])
    return forked

@router.post("/{id}/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    id: uuid.UUID,
    data: QuestionCreate,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    quiz_repo = QuizRepository(session)
    quiz = await quiz_repo.get_by_id(id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    question_repo = QuestionRepository(session)
    data_dict = data.model_dump()
    data_dict["order_index"] = len(quiz.questions)
    
    question = await question_repo.create(quiz_id=id, data=data_dict)
    await session.commit()
    
    # Refresh to ensure relationships are loaded (though create already refreshes options)
    # The response_model needs options, which question_repo.create already eagerly loads.
    return question

@router.put("/{id}/questions/reorder", response_model=QuizDetailResponse)
async def reorder_questions(
    id: uuid.UUID,
    data: ReorderQuestionsRequest,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    quiz_repo = QuizRepository(session)
    quiz = await quiz_repo.get_detail(id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    if quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    existing_ids = {q.id for q in quiz.questions}
    provided_ids = set(data.question_ids)
    
    if existing_ids != provided_ids or len(data.question_ids) != len(existing_ids):
        raise HTTPException(
            status_code=422, 
            detail="question_ids must contain exactly all current question IDs without duplicates"
        )
        
    question_repo = QuestionRepository(session)
    await question_repo.reorder(id, data.question_ids)
    await session.commit()
    
    # Fetch again to get updated order and relations
    await session.refresh(quiz, ["questions"])
    return QuizDetailResponse.model_validate(quiz)
