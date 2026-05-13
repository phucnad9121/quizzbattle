from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from redis.asyncio import Redis
import uuid

from app.api.deps import get_current_user
from app.infrastructure.limiter import limiter
from app.db.session import get_db
from app.infrastructure.redis_client import get_redis
from app.db.models import User, Quiz, Question, GameSession, GameParticipant
from app.services.room_service import room_service
from app.schemas.room import RoomCreate, RoomResponse, RoomJoinResponse
from fastapi import Request

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED, summary="Tạo phòng chơi")
async def create_room(
    room_data: RoomCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint tạo phòng chơi mới:
    1. Kiểm tra Quiz tồn tại.
    2. Kiểm tra quyền sở hữu của user hiện tại.
    3. Kiểm tra Quiz có ít nhất 1 câu hỏi.
    4. Gọi RoomService để tạo phòng.
    """
    # 1. Lấy thông tin Quiz và kiểm tra tồn tại
    result = await db.execute(select(Quiz).where(Quiz.id == room_data.quiz_id))
    quiz = result.scalar_one_or_none()
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Quiz không tồn tại"
        )
        
    # 2. Kiểm tra quyền sở hữu
    if quiz.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn không có quyền tạo phòng cho quiz này"
        )
        
    # 3. Kiểm tra số lượng câu hỏi
    count_result = await db.execute(
        select(func.count(Question.id)).where(Question.quiz_id == quiz.id)
    )
    q_count = count_result.scalar()
    
    if q_count == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="Quiz cần có ít nhất 1 câu hỏi"
        )
        
    # 4. Tiến hành tạo phòng thông qua RoomService
    try:
        session = await room_service.create_room(db, redis, current_user.id, quiz.id)
        return session
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )

@router.get("/{code}", response_model=RoomJoinResponse, summary="Kiểm tra mã phòng")
@limiter.limit("30/minute")
async def get_room_info(
    request: Request,
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint lấy thông tin phòng chơi để join:
    1. Kiểm tra phòng tồn tại.
    2. Kiểm tra trạng thái phòng (nếu đã kết thúc -> 410).
    3. Trả về thông tin cơ bản: mã phòng, trạng thái, chủ phòng, tên quiz và số người chơi.
    """
    # Join để lấy thông tin host và quiz trong 1 câu query
    query = (
        select(GameSession, User.username, Quiz.title)
        .join(User, GameSession.host_id == User.id)
        .join(Quiz, GameSession.quiz_id == Quiz.id)
        .where(GameSession.room_code == code.upper())
    )
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Phòng không tồn tại"
        )
    
    session, host_username, quiz_title = row
    
    if session.status == "finished":
        raise HTTPException(
            status_code=status.HTTP_410_GONE, 
            detail="Phòng đã kết thúc"
        )
        
    # Lấy số lượng người chơi hiện tại
    count_query = select(func.count(GameParticipant.id)).where(
        GameParticipant.session_id == session.id
    )
    count_res = await db.execute(count_query)
    player_count = count_res.scalar() or 0
    
    return {
        "room_code": session.room_code,
        "status": session.status,
        "host_username": host_username,
        "quiz_title": quiz_title,
        "player_count": player_count
    }

@router.get("/{session_id_or_code}/results", summary="Lấy kết quả trận đấu")
async def get_session_results(
    session_id_or_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint lấy kết quả chi tiết của một Game Session:
    Hỗ trợ cả session_id (UUID) và room_code (6 chars).
    """
    # 1. Xác định session_id từ đầu vào
    session_id = None
    try:
        session_id = uuid.UUID(session_id_or_code)
    except ValueError:
        # Nếu không phải UUID, kiểm tra xem có phải room_code không
        if len(session_id_or_code) == 6:
            code_query = select(GameSession.id).where(GameSession.room_code == session_id_or_code.upper())
            code_res = await db.execute(code_query)
            session_id = code_res.scalar_one_or_none()
    
    if not session_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên chơi không tồn tại")

    # 2. Lấy thông tin session và quiz
    session_query = (
        select(GameSession, func.count(Question.id).label("q_count"))
        .join(Question, GameSession.quiz_id == Question.quiz_id)
        .where(GameSession.id == session_id)
        .group_by(GameSession.id)
    )
    session_res = await db.execute(session_query)
    session_row = session_res.first()
    
    if not session_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session không tồn tại")
    
    session, total_questions = session_row

    # 2. Lấy danh sách người tham gia kèm số câu đúng
    from app.db.models.game import PlayerAnswer
    
    # Subquery để đếm số câu đúng cho mỗi participant
    correct_count_sub = (
        select(PlayerAnswer.participant_id, func.count(PlayerAnswer.id).label("correct_count"))
        .where(PlayerAnswer.is_correct == True)
        .group_by(PlayerAnswer.participant_id)
        .subquery()
    )

    query = (
        select(GameParticipant, func.coalesce(correct_count_sub.c.correct_count, 0))
        .outerjoin(correct_count_sub, GameParticipant.id == correct_count_sub.c.participant_id)
        .where(GameParticipant.session_id == session_id)
        .order_by(GameParticipant.total_score.desc())
    )
    result = await db.execute(query)
    rows = result.all()
    
    return {
        "quiz_id": str(session.quiz_id),
        "host_id": str(session.host_id),
        "total_questions": total_questions,
        "participants": [
            {
                "user_id": str(p.user_id) if p.user_id else str(p.id),
                "display_name": p.display_name,
                "score": p.total_score,
                "rank": p.rank or (i + 1),
                "correct_answers": correct_count
            }
            for i, (p, correct_count) in enumerate(rows)
        ]
    }
