import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class RoomCreate(BaseModel):
    quiz_id: uuid.UUID

class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_code: str
    quiz_id: uuid.UUID
    host_id: uuid.UUID
    status: str
    created_at: datetime

class RoomJoinResponse(BaseModel):
    room_code: str
    status: str
    host_username: str
    quiz_title: str
    player_count: int
