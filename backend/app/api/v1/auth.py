
from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.infrastructure.limiter import limiter
from app.db.session import get_db
from app.schemas.auth import LoginRequest, LogoutRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import login_user, logout_user, refresh_tokens, register_user
from app.db.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Đăng ký tài khoản")
@limiter.limit("5/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    session: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Tạo tài khoản người chơi mới.
    """
    return await register_user(session, data)


@router.post("/login", response_model=TokenResponse, summary="Đăng nhập")
@limiter.limit("10/minute")
async def login(
    request: Request,
    data: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Xác thực người dùng và trả về bộ Access/Refresh tokens.
    """
    return await login_user(session, data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    session: AsyncSession = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> TokenResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )
    raw_token = authorization.removeprefix("Bearer ").strip()
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )
    return await refresh_tokens(session, raw_token)


@router.post("/logout")
async def logout(
    data: LogoutRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    await logout_user(session, current_user.id, data.refresh_token)
    return {"status": "ok"}
