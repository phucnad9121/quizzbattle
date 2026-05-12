import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.repositories.user_repo import UserRepository
from app.infrastructure.redis_client import get_redis
from app.schemas.user import UserResponse, UserStatsResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_my_stats(
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    redis = await get_redis()
    cache_key = f"user:stats:{current_user.id}"
    
    cached_stats = await redis.get(cache_key)
    if cached_stats:
        return json.loads(cached_stats)
    
    repo = UserRepository(session)
    stats = await repo.get_stats(current_user.id)
    
    await redis.set(cache_key, json.dumps(stats), ex=300)
    return stats
