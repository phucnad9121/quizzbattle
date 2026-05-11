import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user, get_db
from app.schemas.question import QuestionUpdate, QuestionResponse
from app.repositories.quiz_repo import QuestionRepository, QuizRepository

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("/{id}", response_model=QuestionResponse)
async def get_question(
    id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    question_repo = QuestionRepository(session)
    quiz_repo = QuizRepository(session)

    question = await question_repo.get_by_id(id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    quiz = await quiz_repo.get_by_id(question.quiz_id)
    if not quiz or quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return question

@router.patch("/{id}", response_model=QuestionResponse)
async def update_question(
    id: uuid.UUID,
    data: QuestionUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    question_repo = QuestionRepository(session)
    quiz_repo = QuizRepository(session)
    
    question = await question_repo.get_by_id(id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    quiz = await quiz_repo.get_by_id(question.quiz_id)
    if not quiz or quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Manual validation for options if provided
    if data.options is not None:
        q_type = data.question_type or question.question_type
        correct_count = sum(1 for opt in data.options if opt.is_correct)
        
        if q_type == "multiple_choice":
            if not (2 <= len(data.options) <= 4):
                raise HTTPException(status_code=422, detail="multiple_choice must have 2 to 4 options")
            if correct_count != 1:
                raise HTTPException(status_code=422, detail="multiple_choice must have exactly 1 correct option")
                
        elif q_type == "true_false":
            if len(data.options) != 2:
                raise HTTPException(status_code=422, detail="true_false must have exactly 2 options")
            if correct_count != 1:
                raise HTTPException(status_code=422, detail="true_false must have exactly 1 correct option")
            
            texts = {opt.option_text.strip().lower() for opt in data.options}
            if texts != {"đúng", "sai"}:
                raise HTTPException(status_code=422, detail='true_false options must be "Đúng" and "Sai"')
                
    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        try:
            question = await question_repo.update(id, update_data)
            await session.commit()
        except Exception as e:
            import traceback
            print(f"Error updating question: {e}")
            traceback.print_exc()
            await session.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        
    return question


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    question_repo = QuestionRepository(session)
    quiz_repo = QuizRepository(session)
    
    question = await question_repo.get_by_id(id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    quiz = await quiz_repo.get_by_id(question.quiz_id)
    if not quiz or quiz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # Delete the question
    await question_repo.delete(id)
    
    # Reindex remaining questions
    remaining_questions = await question_repo.get_by_quiz(question.quiz_id)
    ordered_ids = [q.id for q in remaining_questions]
    await question_repo.reorder(question.quiz_id, ordered_ids)
    
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
