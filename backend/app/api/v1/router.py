from fastapi import APIRouter

from app.api.v1 import auth, users, quizzes, questions

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(quizzes.router)
api_router.include_router(questions.router)
