# app/services/game_service.py
import time
import uuid
import asyncio
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from redis.asyncio import Redis

from app.db.models import GameSession, Question, AnswerOption, GameParticipant
from app.infrastructure.redis_client import publish_room_event

class GameService:
    async def start_game(
        self, 
        db: AsyncSession, 
        redis: Redis, 
        room_code: str, 
        user_id: uuid.UUID
    ):
        room_code_upper = room_code.upper()
        stmt = select(GameSession).where(GameSession.room_code == room_code_upper)
        res = await db.execute(stmt)
        room = res.scalar_one_or_none()
        
        if not room or room.host_id != user_id or room.status != "waiting":
            return

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

        room.status = "in_progress"
        room.current_question_idx = 0
        room.started_at = datetime.utcnow()
        await db.commit()

        state_key = f"game:state:{room_code_upper}"
        await redis.hset(state_key, mapping={
            "session_id": str(room.id),
            "host_id": str(room.host_id),
            "status": "in_progress",
            "current_question": "0",
            "question_start_ts": str(time.time()),
            "total_questions": str(len(questions))
        })

        await self._publish_question(room_code_upper, questions[0], 0, len(questions))
        asyncio.create_task(self.question_timer(room_code_upper, 0, questions[0].time_limit_secs))

    async def _publish_question(self, room_code: str, question: Question, idx: int, total: int):
        await publish_room_event(room_code.upper(), {
            "type": "QUESTION_START",
            "payload": {
                "quiz_id": str(question.quiz_id),
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
        room_code_upper = room_code.upper()
        remaining = time_limit
        r = await self._get_redis_safe()
        state_key = f"game:state:{room_code_upper}"
        end_key = f"game:ended:{room_code_upper}:{question_idx}"

        while remaining > 0:
            await asyncio.sleep(1)
            remaining -= 1
            curr = await r.hget(state_key, "current_question")
            if curr != str(question_idx):
                return
            if await r.exists(end_key):
                return

        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await self.end_question(db, r, room_code_upper, question_idx, immediate=False)

    async def _get_redis_safe(self):
        from app.infrastructure.redis_client import get_redis
        return await get_redis()

    async def end_question(self, db: AsyncSession, redis: Redis, room_code: str, question_idx: int, immediate: bool = False):
        room_code_upper = room_code.upper()
        end_key = f"game:ended:{room_code_upper}:{question_idx}"
        
        if not await redis.set(end_key, "1", ex=300, nx=True):
            return

        stmt = select(GameSession).where(GameSession.room_code == room_code_upper)
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

        correct_option = next((o for o in question.options if o.is_correct), None)
        
        # Lấy Leaderboard mới nhất
        leaderboard = await self.get_leaderboard(redis, room_code_upper)

        await publish_room_event(room_code_upper, {
            "type": "QUESTION_END",
            "payload": {
                "question_idx": question_idx,
                "correct_option_id": str(correct_option.id) if correct_option else None,
                "correct_option_text": correct_option.option_text if correct_option else "",
                "wait_time": 0 if immediate else 5,
                "leaderboard": leaderboard[:10]
            }
        })

        async def transition_task():
            if not immediate:
                await asyncio.sleep(5)
            
            from app.db.session import AsyncSessionLocal
            async with AsyncSessionLocal() as db_task:
                stmt_n = select(GameSession).where(GameSession.room_code == room_code_upper)
                res_n = await db_task.execute(stmt_n)
                r_task = res_n.scalar_one_or_none()
                if not r_task: return

                stmt_next = select(Question).where(
                    Question.quiz_id == r_task.quiz_id, 
                    Question.order_index == question_idx + 1
                ).options(selectinload(Question.options))
                res_next = await db_task.execute(stmt_next)
                next_q = res_next.scalar_one_or_none()

                if next_q:
                    r_task.current_question_idx = question_idx + 1
                    await db_task.commit()
                    
                    total_questions = int((await redis.hget(f"game:state:{room_code_upper}", "total_questions")) or 0)
                    await redis.hset(f"game:state:{room_code_upper}", mapping={
                        "current_question": str(question_idx + 1),
                        "question_start_ts": str(time.time())
                    })
                    
                    asyncio.create_task(self.question_timer(room_code_upper, question_idx + 1, next_q.time_limit_secs))
                    await self._publish_question(room_code_upper, next_q, question_idx + 1, total_questions)
                else:
                    r_task.status = "finished"
                    r_task.finished_at = datetime.utcnow()
                    await db_task.commit()
                    
                    await redis.hset(f"game:state:{room_code_upper}", "status", "finished")
                    final_results = await self.sync_final_results(db_task, redis, room_code_upper, r_task.id)
                    
                    await publish_room_event(room_code_upper, {
                        "type": "GAME_OVER",
                        "payload": {
                            "quiz_id": str(r_task.quiz_id),
                            "leaderboard": final_results[:10]
                        }
                    })

        asyncio.create_task(transition_task())

    async def skip_question(self, db: AsyncSession, redis: Redis, room_code: str, user_id: uuid.UUID):
        room_code_upper = room_code.upper()
        state_key = f"game:state:{room_code_upper}"
        state = await redis.hgetall(state_key)
        
        if not state or state.get("status") != "in_progress":
            return
            
        if state.get("host_id") != str(user_id):
            return 
            
        curr_q_idx = int(state.get("current_question", 0))
        await self.end_question(db, redis, room_code_upper, curr_q_idx, immediate=True)

    async def sync_final_results(self, db: AsyncSession, redis: Redis, room_code: str, session_id: uuid.UUID) -> list[dict]:
        room_code_upper = room_code.upper()
        from sqlalchemy import update
        from app.db.models.game import GameParticipant
        
        leaderboard = await self.get_leaderboard(redis, room_code_upper)
        for entry in leaderboard:
            try:
                user_id_str = entry.get("user_id")
                if user_id_str and user_id_str != "None":
                    stmt = (
                        update(GameParticipant)
                        .where(
                            GameParticipant.session_id == session_id,
                            GameParticipant.user_id == uuid.UUID(user_id_str)
                        )
                        .values(total_score=entry["score"], rank=entry["rank"])
                    )
                    await db.execute(stmt)
            except Exception as e:
                print(f"Error syncing result for {entry.get('display_name')}: {e}")
        
        await db.commit()
        return leaderboard

    async def get_leaderboard(self, redis: Redis, room_code: str) -> list[dict]:
        room_code_upper = room_code.upper()
        # Lấy điểm từ ZSET (Chỉ chứa user_id)
        entries = await redis.zrevrange(
            f"game:leaderboard:{room_code_upper}", 0, 49, withscores=True
        )
        
        # Lấy tên từ HASH bảng ánh xạ
        names_map = await redis.hgetall(f"game:names:{room_code_upper}")
        
        results = []
        for i, (user_id_raw, score_raw) in enumerate(entries):
            # Xử lý ID (có thể là bytes hoặc str)
            user_id_str = user_id_raw.decode() if isinstance(user_id_raw, bytes) else str(user_id_raw)
            
            # Xử lý Tên (lấy từ names_map)
            display_name_raw = names_map.get(user_id_raw) or names_map.get(user_id_str)
            if display_name_raw:
                display_name = display_name_raw.decode() if isinstance(display_name_raw, bytes) else str(display_name_raw)
            else:
                display_name = user_id_str # Fallback nếu không tìm thấy tên
                
            results.append({
                "rank": i + 1, 
                "user_id": user_id_str,
                "display_name": display_name,
                "score": int(float(score_raw))
            })
        return results

    async def record_answer(
        self, 
        redis: Redis, 
        room_code: str, 
        user_id: uuid.UUID | str,
        display_name: str, 
        score_earned: int
    ):
        room_code_upper = room_code.upper()
        user_id_str = str(user_id)
        
        # 1. Cập nhật điểm trong ZSET
        await redis.zincrby(f"game:leaderboard:{room_code_upper}", score_earned, user_id_str)
        
        # 2. Cập nhật/Đảm bảo tên trong HASH mapping
        await redis.hset(f"game:names:{room_code_upper}", user_id_str, display_name)

    async def process_answer(
        self, 
        db: AsyncSession, 
        redis: Redis, 
        room_code: str, 
        user_id: uuid.UUID, 
        question_id: uuid.UUID, 
        selected_option_id: uuid.UUID
    ) -> dict:
        room_code_upper = room_code.upper()
        state_key = f"game:state:{room_code_upper}"
        state = await redis.hgetall(state_key)
        
        if not state or state.get("status") != "in_progress":
            return {"error": "Trò chơi chưa bắt đầu hoặc đã kết thúc"}

        curr_q_idx = state.get("current_question")
        answered_key = f"game:answered:{room_code_upper}:{curr_q_idx}"
        if await redis.sismember(answered_key, str(user_id)):
            return {"error": "Bạn đã trả lời câu hỏi này rồi"}

        start_ts = float(state.get("question_start_ts", 0))
        answer_time_ms = int((time.time() - start_ts) * 1000)

        stmt_q = select(Question).where(Question.id == question_id).options(selectinload(Question.options))
        res_q = await db.execute(stmt_q)
        question = res_q.scalar_one_or_none()
        if not question: return {"error": "Câu hỏi không tồn tại"}

        time_limit_ms = question.time_limit_secs * 1000
        is_correct = False
        score_earned = 0

        if answer_time_ms <= time_limit_ms + 1000:
            correct_opt = next((o for o in question.options if o.is_correct), None)
            is_correct = (str(correct_opt.id) == str(selected_option_id)) if correct_opt else False
            if is_correct:
                multiplier = max(0.5, 1 - (min(answer_time_ms, time_limit_ms) / time_limit_ms) * 0.5)
                score_earned = int(question.points * multiplier)

        # Lưu vết đã trả lời
        await redis.sadd(answered_key, str(user_id))
        await redis.expire(answered_key, 300)

        from app.db.models.game import GameParticipant, PlayerAnswer
        stmt_p = select(GameParticipant).where(
            GameParticipant.session_id == uuid.UUID(state.get("session_id")),
            GameParticipant.user_id == user_id
        )
        res_p = await db.execute(stmt_p)
        participant = res_p.scalar_one_or_none()
        
        if participant:
            # 1. CỘNG ĐIỂM VÀO REDIS TRƯỚC (Rất quan trọng!)
            await self.record_answer(redis, room_code_upper, user_id, participant.display_name, score_earned)
            
            # 2. Cập nhật DB (Chạy song song hoặc sau đó)
            participant.total_score += score_earned
            await db.commit()

            # 3. Kiểm tra kết thúc sớm
            active_count = await redis.scard(f"game:active:{room_code_upper}")
            answered_count = await redis.scard(answered_key)
            if active_count > 0 and answered_count >= active_count:
                # Đợi một chút cực ngắn để đảm bảo Redis đã ghi xong (Optional nhưng an toàn)
                await self.end_question(db, redis, room_code_upper, int(curr_q_idx), immediate=False)

            # Lưu PlayerAnswer vào DB
            from app.db.session import AsyncSessionLocal
            async def save_task():
                async with AsyncSessionLocal() as d:
                    d.add(PlayerAnswer(
                        participant_id=participant.id,
                        question_id=question_id,
                        selected_option=selected_option_id,
                        is_correct=is_correct,
                        score_earned=score_earned,
                        answer_time_ms=answer_time_ms
                    ))
                    await d.commit()
            asyncio.create_task(save_task())

        return {
            "is_correct": is_correct,
            "score_earned": score_earned,
            "answer_time_ms": answer_time_ms,
            "correct_option_id": str(next((o.id for o in question.options if o.is_correct), ""))
        }

game_service = GameService()