# alembic/env.py — pattern chuẩn cho SQLAlchemy 2.0 async
from app.core.config import settings
from app.db.models.base import Base
from app.db import models  # noqa: F401 — import all models để Alembic detect

config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)

target_metadata = Base.metadata

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,          # detect thay đổi kiểu dữ liệu
            compare_server_default=True, # detect thay đổi default value
        )
        with context.begin_transaction():
            context.run_migrations()