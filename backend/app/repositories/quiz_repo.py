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

    async def get_public(self, page: int, size: int, search: str | None = None, sort: str = "newest") -> Tuple[Sequence[Quiz], int]:
        filters = [Quiz.is_public == True]
        if search:
            filters.append(Quiz.title.ilike(f"%{search}%"))

        count_query = select(func.count(Quiz.id)).where(*filters)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = (
            select(Quiz)
            .where(*filters)
            .options(selectinload(Quiz.questions))
            .limit(size)
            .offset((page - 1) * size)
        )

        if sort == "newest":
            query = query.order_by(Quiz.created_at.desc())
        # Popularity sort can be added here later with joins
        else:
            query = query.order_by(Quiz.created_at.desc())

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

    async def fork(self, quiz_id: uuid.UUID, new_owner_id: uuid.UUID) -> Quiz | None:
        # 1. Check if user already forked this quiz
        existing_query = select(Quiz).where(
            Quiz.owner_id == new_owner_id,
            Quiz.forked_from_id == quiz_id
        ).options(selectinload(Quiz.questions))
        existing_result = await self.session.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        if existing:
            return existing

        # 2. Get original quiz with questions and options
        original = await self.get_detail(quiz_id)
        if not original:
            return None
        
        # 3. Create new quiz based on original
        new_quiz = Quiz(
            owner_id=new_owner_id,
            title=f"{original.title} (Forked)",
            description=original.description,
            cover_url=original.cover_url,
            is_public=False,
            forked_from_id=quiz_id
        )
        self.session.add(new_quiz)
        await self.session.flush()
        
        # 4. Clone questions and options
        for q in original.questions:
            new_q = Question(
                quiz_id=new_quiz.id,
                question_text=q.question_text,
                question_type=q.question_type,
                time_limit_secs=q.time_limit_secs,
                points=q.points,
                order_index=q.order_index,
                image_url=q.image_url
            )
            self.session.add(new_q)
            await self.session.flush()
            
            for opt in q.options:
                new_opt = AnswerOption(
                    question_id=new_q.id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct,
                    order_index=opt.order_index
                )
                self.session.add(new_opt)
        
        await self.session.flush()
        return new_quiz


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
        return await self.get_by_id(question.id)

    async def update(self, id: uuid.UUID, data: dict) -> Question:
        question = await self.get_by_id(id)
        if not question:
            return None
        
        # 1. Cập nhật các thông tin cơ bản
        for key, value in data.items():
            if key != "options" and hasattr(question, key):
                setattr(question, key, value)
        
        # 2. Cập nhật options (Nếu có trong payload)
        if "options" in data:
            new_options_data = data["options"]
            # Sắp xếp options hiện có theo order_index để cập nhật đúng vị trí
            existing_options = sorted(question.options, key=lambda x: x.order_index)
            
            for i, opt_data in enumerate(new_options_data):
                if i < len(existing_options):
                    # Cập nhật bản ghi đã tồn tại
                    existing_options[i].option_text = opt_data["option_text"]
                    existing_options[i].is_correct = opt_data["is_correct"]
                    existing_options[i].order_index = i
                else:
                    # Thêm bản ghi mới nếu số lượng tăng lên
                    new_opt = AnswerOption(
                        question_id=question.id,
                        option_text=opt_data["option_text"],
                        is_correct=opt_data["is_correct"],
                        order_index=i
                    )
                    self.session.add(new_opt)
            
            # Xóa các bản ghi thừa nếu số lượng giảm đi
            if len(existing_options) > len(new_options_data):
                for j in range(len(new_options_data), len(existing_options)):
                    await self.session.delete(existing_options[j])

        await self.session.flush()
        return question

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
