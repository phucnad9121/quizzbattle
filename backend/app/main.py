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


app = FastAPI(
    title="QuizBattle API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
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