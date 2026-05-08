import uuid
from typing import Sequence, Tuple, Any

from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload

from app.db.models.quiz import Quiz
from app.db.models.question import Question, AnswerOption
from app.repositories.base import BaseRepository

class QuizRepository(BaseRepository):
    async def get_by_id(self, quiz_id: uuid.UUID) -> Quiz | None:
        query = select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_detail(self, quiz_id: uuid.UUID) -> Quiz | None:
        query = (
            select(Quiz)
            .where(Quiz.id == quiz_id)
            .options(
                selectinload(Quiz.questions).selectinload(Question.options)
            )
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_owner(self, user_id: uuid.UUID, page: int, size: int) -> Tuple[Sequence[Quiz], int]:
        count_query = select(func.count(Quiz.id)).where(Quiz.owner_id == user_id)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = (
            select(Quiz)
            .where(Quiz.owner_id == user_id)
            .order_by(Quiz.created_at.desc())
            .options(selectinload(Quiz.questions))
            .limit(size)
            .offset((page - 1) * size)
        )
        result = await self.session.execute(query)
        items = result.scalars().all()
        return items, total

    async def create(self, owner_id: uuid.UUID, data: dict[str, Any]) -> Quiz:
        quiz = Quiz(owner_id=owner_id, **data)
        self.session.add(quiz)
        await self.session.flush()
        return quiz

    async def update(self, quiz_id: uuid.UUID, data: dict[str, Any]) -> Quiz | None:
        if not data:
            return await self.get_by_id(quiz_id)
        
        query = update(Quiz).where(Quiz.id == quiz_id).values(**data).returning(Quiz)
        result = await self.session.execute(query)
        await self.session.flush()
        return result.scalar_one_or_none()

    async def delete(self, quiz_id: uuid.UUID) -> bool:
        query = delete(Quiz).where(Quiz.id == quiz_id)
        result = await self.session.execute(query)
        await self.session.flush()
        return result.rowcount > 0

    async def is_owner(self, quiz_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        query = select(Quiz.id).where(Quiz.id == quiz_id, Quiz.owner_id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none() is not None


class QuestionRepository(BaseRepository):
    async def get_by_id(self, question_id: uuid.UUID) -> Question | None:
        query = select(Question).where(Question.id == question_id).options(selectinload(Question.options))
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_quiz(self, quiz_id: uuid.UUID) -> Sequence[Question]:
        query = (
            select(Question)
            .where(Question.quiz_id == quiz_id)
            .options(selectinload(Question.options))
            .order_by(Question.order_index)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def create(self, quiz_id: uuid.UUID, data: dict[str, Any]) -> Question:
        options_data = data.pop("options", [])
        question = Question(quiz_id=quiz_id, **data)
        self.session.add(question)
        await self.session.flush()

        for idx, opt in enumerate(options_data):
            option = AnswerOption(question_id=question.id, order_index=idx, **opt)
            self.session.add(option)
        
        await self.session.flush()
        # Refresh to eager load options
        await self.session.refresh(question, ["options"])
        return question

    async def update(self, question_id: uuid.UUID, data: dict[str, Any]) -> Question | None:
        options_data = data.pop("options", None)
        
        if data:
            stmt = update(Question).where(Question.id == question_id).values(**data)
            await self.session.execute(stmt)
        
        if options_data is not None:
            # delete old options
            del_stmt = delete(AnswerOption).where(AnswerOption.question_id == question_id)
            await self.session.execute(del_stmt)
            
            # insert new options
            for idx, opt in enumerate(options_data):
                option = AnswerOption(question_id=question_id, order_index=idx, **opt)
                self.session.add(option)
        
        await self.session.flush()
        return await self.get_by_id(question_id)

    async def delete(self, question_id: uuid.UUID) -> bool:
        query = delete(Question).where(Question.id == question_id)
        result = await self.session.execute(query)
        await self.session.flush()
        return result.rowcount > 0

    async def reorder(self, quiz_id: uuid.UUID, ordered_ids: list[uuid.UUID]) -> None:
        for idx, q_id in enumerate(ordered_ids):
            stmt = update(Question).where(Question.id == q_id, Question.quiz_id == quiz_id).values(order_index=idx)
            await self.session.execute(stmt)
        await self.session.flush()
