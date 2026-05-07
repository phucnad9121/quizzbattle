# Makefile — QuizBattle shortcuts
.PHONY: help up down logs shell-be shell-db migrate test lint format

# ── Hiển thị help ──────────────────────────────────
help:
	@echo "QuizBattle — Available commands:"
	@echo ""
	@echo "  Docker:"
	@echo "    make up          Start all services"
	@echo "    make up-db       Start only postgres + redis"
	@echo "    make down        Stop all services"
	@echo "    make logs        Tail all logs"
	@echo "    make logs-be     Tail backend logs"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate     Run alembic upgrade head"
	@echo "    make migration m=\"message\"  Create new migration"
	@echo "    make db-reset    Drop + recreate DB (DANGER)"
	@echo ""
	@echo "  Dev:"
	@echo "    make shell-be    Bash into backend container"
	@echo "    make shell-db    psql into postgres"
	@echo "    make test        Run pytest"
	@echo "    make lint        Run ruff + mypy"
	@echo "    make format      Run black"
	@echo ""
	@echo "  Setup:"
	@echo "    make conda-setup  Create conda env (first time)"
	@echo "    make dev-be       Run backend locally (conda)"

# ── Docker ─────────────────────────────────────────
up:
	docker compose up -d

up-db:
	docker compose up postgres redis -d

down:
	docker compose down

logs:
	docker compose logs -f

logs-be:
	docker compose logs -f backend

rebuild:
	docker compose up -d --build

# ── Database / Alembic ─────────────────────────────
migrate:
	docker compose exec backend alembic upgrade head

migration:
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

db-reset:
	@echo "⚠️  This will DROP all data. Press Ctrl+C to cancel."
	@sleep 3
	docker compose exec postgres psql -U quizbattle -c "DROP DATABASE IF EXISTS quizbattle_db;"
	docker compose exec postgres psql -U quizbattle -c "CREATE DATABASE quizbattle_db;"
	$(MAKE) migrate

# ── Shells ─────────────────────────────────────────
shell-be:
	docker compose exec backend bash

shell-db:
	docker compose exec postgres psql -U quizbattle -d quizbattle_db

# ── Testing & Code Quality ─────────────────────────
test:
	docker compose exec backend pytest -v

lint:
	docker compose exec backend ruff check app/
	docker compose exec backend mypy app/ --ignore-missing-imports

format:
	docker compose exec backend black app/

# ── Local Dev (Conda) ──────────────────────────────
conda-setup:
	conda env create -f environment.yml
	@echo " Run: conda activate quizbattle"

dev-be:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000