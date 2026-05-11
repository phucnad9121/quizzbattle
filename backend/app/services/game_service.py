# app/services/game_service.py
import time
import uuid
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from redis.asyncio import Redis

from app.db.models import GameSession, Question, AnswerOption
from app.infrastructure.redis_client import publish_room_event

class GameService:
    async def start_game(
        self, 
        db: AsyncSession, 
        redis: Redis, 
        room_code: str, 
        user_id: uuid.UUID
    ):
        """Bắt đầu trò chơi và kích hoạt timer cho câu hỏi đầu tiên."""
        stmt = select(GameSession).where(GameSession.room_code == room_code.upper())
        res = await db.execute(stmt)
        room = res.scalar_one_or_none()
        
        if not room or room.host_id != user_id or room.status != "waiting":
            return

        # Lấy câu hỏi đầu tiên
        stmt_questions = (
            select(Question)
            .where(Question.quiz_id == room.quiz_id)
            .order_by(Question.order_index)
            .options(selectinload(Question.options))
        )
        res_q = await db.execute(stmt_questions)
        questions = res_q.scalars().all()
        
        if not questions:
            return

        # Cập nhật trạng thái
        room.status = "in_progress"
        room.current_question_idx = 0
        room.started_at = datetime.utcnow()
        await db.commit()

        # Cập nhật Redis
        state_key = f"game:state:{room_code}"
        await redis.hset(state_key, mapping={
            "status": "in_progress",
            "current_question": "0",
            "question_start_ts": str(time.time()),
            "total_questions": str(len(questions))
        })

        # Gửi câu hỏi đầu tiên
        await self._publish_question(room_code, questions[0], 0, len(questions))
        
        # Kích hoạt timer (chỉ chạy trên worker của host)
        import asyncio
        asyncio.create_task(self.question_timer(room_code, 0, questions[0].time_limit_secs))

    async def _publish_question(self, room_code: str, question: Question, idx: int, total: int):
        await publish_room_event(room_code, {
            "type": "QUESTION_START",
            "payload": {
                "question_id": str(question.id),
                "question_idx": idx,
                "total_questions": total,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "time_limit_secs": question.time_limit_secs,
                "points": question.points,
                "options": [{"id": str(o.id), "option_text": o.option_text} for o in question.options]
            }
        })

    async def question_timer(self, room_code: str, question_idx: int, time_limit: int):
        """Đợi hết giờ hoặc cho đến khi tất cả đã trả lời."""
        import asyncio
        from app.infrastructure.redis_client import get_redis
        from app.db.session import AsyncSessionLocal

        # Đợi time_limit giây
        # Trong thực tế, ta có thể dùng loop ngắn để check sớm nếu tất cả đã trả lời
        remaining = time_limit
        r = await get_redis()
        state_key = f"game:state:{room_code}"
        
        while remaining > 0:
            await asyncio.sleep(1)
            remaining -= 1
            # Check sớm: Nếu số câu trả lời trong Redis == số participants
            # (Logic này sẽ được hoàn thiện ở task SUBMIT_ANSWER)
            
            # Kiểm tra xem có bị stale không (ví dụ game đã kết thúc hoặc nhảy câu tiếp)
            curr = await r.hget(state_key, "current_question")
            if curr != str(question_idx):
                return

        # Hết giờ -> Kết thúc câu hỏi
        async with AsyncSessionLocal() as db:
            await self.end_question(db, r, room_code, question_idx)

    async def end_question(self, db: AsyncSession, redis: Redis, room_code: str, question_idx: int):
        """Kết thúc câu hỏi hiện tại, show đáp án và chuẩn bị câu tiếp."""
        # 1. Lấy thông tin phòng và câu hỏi hiện tại
        stmt = select(GameSession).where(GameSession.room_code == room_code.upper())
        res = await db.execute(stmt)
        room = res.scalar_one_or_none()
        if not room: return

        stmt_q = (
            select(Question)
            .where(Question.quiz_id == room.quiz_id, Question.order_index == question_idx)
            .options(selectinload(Question.options))
        )
        res_q = await db.execute(stmt_q)
        question = res_q.scalar_one_or_none()
        if not question: return

        # 2. Tìm đáp án đúng
        correct_opt = next((o for o in question.options if o.is_correct), None)
        
        # 3. Lấy Leaderboard hiện tại
        leaderboard = await self.get_leaderboard(redis, room_code)

        # 4. Thông báo QUESTION_END
        await publish_room_event(room_code, {
            "type": "QUESTION_END",
            "payload": {
                "question_idx": question_idx,
                "correct_option_id": str(correct_opt.id) if correct_opt else None,
                "correct_option_text": correct_opt.option_text if correct_opt else "",
                "leaderboard": leaderboard[:5]
            }
        })

        # 5. Đợi 3 giây rồi sang câu tiếp hoặc kết thúc game
        import asyncio
        await asyncio.sleep(3)

        # Kiểm tra xem còn câu tiếp theo không
        stmt_next = select(Question).where(
            Question.quiz_id == room.quiz_id, 
            Question.order_index == question_idx + 1
        ).options(selectinload(Question.options))
        res_next = await db.execute(stmt_next)
        next_q = res_next.scalar_one_or_none()

        if next_q:
            # Chuyển sang câu tiếp
            room.current_question_idx = question_idx + 1
            await db.commit()
            
            await redis.hset(f"game:state:{room_code}", mapping={
                "current_question": str(question_idx + 1),
                "question_start_ts": str(time.time())
            })
            
            await self._publish_question(room_code, next_q, question_idx + 1, int(await redis.hget(f"game:state:{room_code}", "total_questions")))
            # Kích hoạt timer cho câu tiếp
            asyncio.create_task(self.question_timer(room_code, question_idx + 1, next_q.time_limit_secs))
        else:
            # Hết câu hỏi -> GAME_OVER
            room.status = "finished"
            room.finished_at = datetime.utcnow()
            
            # Đồng bộ kết quả cuối cùng từ Redis về DB
            final_results = await self.sync_final_results(db, redis, room_code, room.id)
            await db.commit()
            
            await redis.hset(f"game:state:{room_code}", "status", "finished")
            
            await publish_room_event(room_code, {
                "type": "GAME_OVER",
                "payload": {"leaderboard": final_results[:10]}
            })

    async def sync_final_results(self, db: AsyncSession, redis: Redis, room_code: str, session_id: uuid.UUID) -> list[dict]:
        """Đồng bộ điểm và xếp hạng từ Redis về PostgreSQL."""
        from sqlalchemy import update
        from app.db.models.game import GameParticipant
        
        leaderboard = await self.get_leaderboard(redis, room_code)
        
        for entry in leaderboard:
            stmt = (
                update(GameParticipant)
                .where(
                    GameParticipant.session_id == session_id,
                    GameParticipant.user_id == uuid.UUID(entry["user_id"])
                )
                .values(total_score=entry["score"], rank=entry["rank"])
            )
            await db.execute(stmt)
        
        return leaderboard

    async def get_leaderboard(self, redis: Redis, room_code: str) -> list[dict]:
        # Lấy top 50, thứ tự giảm dần
        entries = await redis.zrevrange(
            f"game:leaderboard:{room_code}", 0, 49, withscores=True
        )
        return [
            {
                "rank": i+1, 
                "user_id": m.split(":")[0],
                "display_name": m.split(":")[1],
                "score": int(s)
            }
            for i, (m, s) in enumerate(entries)
        ]

    async def record_answer(
        self, 
        redis: Redis, 
        room_code: str, 
        user_id: uuid.UUID,
        display_name: str, 
        score_earned: int
    ):
        member = f"{user_id}:{display_name}"
        await redis.zincrby(f"game:leaderboard:{room_code}", score_earned, member)

    async def process_answer(
        self, 
        db: AsyncSession, 
        redis: Redis, 
        room_code: str, 
        user_id: uuid.UUID, 
        question_id: uuid.UUID, 
        selected_option_id: uuid.UUID
    ) -> dict:
        """
        Xử lý đáp án từ người chơi:
        1. Kiểm tra thời gian và trạng thái câu hỏi.
        2. Tính điểm dựa trên tính đúng đắn và tốc độ.
        3. Cập nhật Leaderboard Redis và lưu PlayerAnswer vào DB.
        """
        state_key = f"game:state:{room_code}"
        state = await redis.hgetall(state_key)
        
        if not state or state.get("status") != "in_progress":
            return {"error": "Trò chơi chưa bắt đầu hoặc đã kết thúc"}

        # 1. Kiểm tra đã trả lời chưa
        curr_q_idx = state.get("current_question")
        answered_key = f"game:answered:{room_code}:{curr_q_idx}"
        if await redis.sismember(answered_key, str(user_id)):
            return {"error": "Bạn đã trả lời câu hỏi này rồi"}

        # 2. Tính thời gian trả lời thực tế (ms)
        start_ts = float(state.get("question_start_ts", 0))
        now_ts = time.time()
        answer_time_ms = int((now_ts - start_ts) * 1000)

        # 3. Lấy thông tin câu hỏi và đáp án
        stmt_q = select(Question).where(Question.id == question_id).options(selectinload(Question.options))
        res_q = await db.execute(stmt_q)
        question = res_q.scalar_one_or_none()
        if not question:
            return {"error": "Câu hỏi không tồn tại"}

        time_limit_ms = question.time_limit_secs * 1000
        is_correct = False
        score_earned = 0

        # Nếu còn trong thời gian cho phép (buffer 500ms cho network latency)
        if answer_time_ms <= time_limit_ms + 500:
            correct_opt = next((o for o in question.options if o.is_correct), None)
            is_correct = (str(correct_opt.id) == str(selected_option_id)) if correct_opt else False
            
            if is_correct:
                # Công thức: score = base_points * max(0.5, 1 - (answer_time_ms / time_limit_ms) * 0.5)
                multiplier = max(0.5, 1 - (min(answer_time_ms, time_limit_ms) / time_limit_ms) * 0.5)
                score_earned = int(question.points * multiplier)

        # 4. Lưu vết đã trả lời vào Redis ngay lập tức
        await redis.sadd(answered_key, str(user_id))
        await redis.expire(answered_key, 300)

        # 5. Cập nhật Leaderboard trong Redis và DB
        from app.db.models.game import GameParticipant, PlayerAnswer
        stmt_p = select(GameParticipant).where(
            GameParticipant.session_id == uuid.UUID(state.get("session_id")),
            GameParticipant.user_id == user_id
        )
        res_p = await db.execute(stmt_p)
        participant = res_p.scalar_one_or_none()
        
        if participant:
            # Cập nhật Redis ZSET
            await self.record_answer(redis, room_code, user_id, participant.display_name, score_earned)
            # Cập nhật DB Participant
            participant.total_score += score_earned
            await db.commit()

            # 6. Lưu PlayerAnswer vào DB (async task)
            from app.db.session import AsyncSessionLocal
            async def save_answer_task():
                async with AsyncSessionLocal() as d:
                    ans = PlayerAnswer(
                        participant_id=participant.id,
                        question_id=question_id,
                        selected_option=selected_option_id,
                        is_correct=is_correct,
                        score_earned=score_earned,
                        answer_time_ms=answer_time_ms
                    )
                    d.add(ans)
                    await d.commit()
            
            import asyncio
            asyncio.create_task(save_answer_task())

        return {
            "is_correct": is_correct,
            "score_earned": score_earned,
            "answer_time_ms": answer_time_ms
        }

game_service = GameService()