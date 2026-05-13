# backend/app/core/exceptions.py
import logging
import sys
from typing import Any, Dict, Optional, Union

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Cấu hình logger chuyên dụng cho Error Handler
logger = logging.getLogger("app.exceptions")
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)
logger.setLevel(logging.ERROR)

class ErrorResponse(BaseModel):
    detail: str
    code: str
    status: int
    meta: Optional[Dict[str, Any]] = None

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Xử lý các lỗi HTTPException (400, 401, 403, 404,...)"""
    error_content = ErrorResponse(
        detail=exc.detail if isinstance(exc.detail, str) else str(exc.detail),
        code=f"ERR_{exc.status_code}",
        status=exc.status_code
    ).model_dump()
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_content,
        headers=getattr(exc, "headers", None)
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Xử lý lỗi validate dữ liệu đầu vào (422)"""
    # Gom các lỗi validation lại cho thân thiện
    errors = []
    for error in exc.errors():
        loc = " -> ".join(str(l) for l in error["loc"])
        msg = error["msg"]
        errors.append(f"{loc}: {msg}")
    
    detail = "Dữ liệu đầu vào không hợp lệ: " + "; ".join(errors)
    
    error_content = ErrorResponse(
        detail=detail,
        code="ERR_VALIDATION_FAILED",
        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        meta={"errors": exc.errors()}
    ).model_dump()

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_content
    )

async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Xử lý tất cả các lỗi không lường trước (500)"""
    # Log chi tiết lỗi ở server để debug
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    
    error_content = ErrorResponse(
        detail="Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau hoặc liên hệ quản trị viên.",
        code="ERR_INTERNAL_SERVER_ERROR",
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    ).model_dump()

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_content
    )

async def rate_limit_exceeded_handler(request: Request, exc: Any) -> JSONResponse:
    """Xử lý lỗi khi người dùng vượt quá giới hạn request (429)"""
    error_content = ErrorResponse(
        detail=f"Bạn đã thao tác quá nhanh. Vui lòng thử lại sau.",
        code="ERR_TOO_MANY_REQUESTS",
        status=status.HTTP_429_TOO_MANY_REQUESTS
    ).model_dump()

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=error_content,
        headers={"Retry-After": str(getattr(exc, "retry_after", 60))}
    )
