# backend/app/db/__init__.py
# Import tất cả models ở đây để Alembic autogenerate detect được
from app.db.models.base import Base  # noqa: F401
from app.db.models.user import User, RefreshToken  # noqa: F401
# Sẽ thêm Quiz, Question, GameSession... sau