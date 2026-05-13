from fastapi import APIRouter

from app.api.v1 import auth, users, quizzes, questions, rooms, ws

api_router = APIRouter()
api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(users.router, tags=["Users"])
api_router.include_router(quizzes.router, tags=["Quizzes"])
api_router.include_router(questions.router, tags=["Questions"])
api_router.include_router(rooms.router, tags=["Rooms"])
api_router.include_router(ws.router, tags=["WebSocket"])
