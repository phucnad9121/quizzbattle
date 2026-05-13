# backend/app/infrastructure/limiter.py
from slowapi import Limiter
from app.core.config import settings
from fastapi import Request

def get_real_ip(request: Request) -> str:
    """
    Lấy địa chỉ IP thật của người dùng.
    Ưu tiên lấy từ X-Forwarded-For nếu ứng dụng chạy sau Proxy.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # X-Forwarded-For có thể chứa chuỗi các IP, ta lấy cái đầu tiên
        return forwarded.split(",")[0].strip()
    
    # Nếu không có proxy, lấy trực tiếp từ client host
    return request.client.host if request.client else "127.0.0.1"

# Khởi tạo Limiter với Redis làm storage backend
limiter = Limiter(
    key_func=get_real_ip,
    storage_uri=settings.redis_url
)
