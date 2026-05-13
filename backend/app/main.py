# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
    rate_limit_exceeded_handler,
)
from slowapi.errors import RateLimitExceeded
from app.infrastructure.limiter import limiter


def _parse_allowed_origins() -> list[str]:
    origins = [origin.strip() for origin in settings.allowed_origins.split(",")]
    # Add 127.0.0.1 if localhost is present
    extra_origins = []
    for o in origins:
        if "localhost" in o:
            extra_origins.append(o.replace("localhost", "127.0.0.1"))
    return [origin for origin in (origins + extra_origins) if origin]


tags_metadata = [
    {"name": "Auth", "description": "Xác thực người chơi (Đăng nhập, Đăng ký, Đăng xuất)"},
    {"name": "Users", "description": "Quản lý thông tin người dùng"},
    {"name": "Quizzes", "description": "Tạo và quản lý bộ câu hỏi"},
    {"name": "Rooms", "description": "Quản lý phòng game và kết quả"},
    {"name": "WebSocket", "description": "Giao thức Real-time cho game (không hiển thị trong REST docs)"},
]

app = FastAPI(
    title="QuizBattle API",
    description="""
🚀 **QuizBattle API** cung cấp hệ thống backend cho trò chơi đố vui trực tuyến thời gian thực.

## Tính năng chính
* 🔐 **Xác thực**: JWT Auth với Access/Refresh tokens.
* 📝 **Quản lý Quiz**: CRUD quiz, câu hỏi và hình ảnh.
* 🎮 **Game Engine**: Điều phối trận đấu qua WebSocket.
* 📊 **Thống kê**: Bảng xếp hạng và kết quả chi tiết.
""",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=tags_metadata,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
# Standardized Rate Limit handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Custom Global Handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "QuizBattle API"}