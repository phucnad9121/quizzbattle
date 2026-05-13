import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class RoomCreate(BaseModel):
    quiz_id: uuid.UUID

class RoomResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "0768946c-205a-4f65-8205-7159500e44be",
                "room_code": "9KW57Y",
                "quiz_id": "91567a87-a0ad-49a2-b3d8-d949109fecb5",
                "host_id": "93ec90c1-c389-4e03-bd30-5db9c3f4fda6",
                "status": "waiting",
                "created_at": "2026-05-13T16:18:15"
            }
        }
    )

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

    model_config = {
        "json_schema_extra": {
            "example": {
                "room_code": "9KW57Y",
                "status": "waiting",
                "host_username": "phucnad",
                "quiz_title": "Lịch sử Việt Nam",
                "player_count": 5
            }
        }
    }
