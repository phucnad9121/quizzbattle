# app/services/game_service.py (excerpt)
async def get_leaderboard(self, room_code: str) -> list[dict]:
    r = await get_redis()
    # Lấy top 50, thứ tự giảm dần
    entries = await r.zrevrange(
        f"game:leaderboard:{room_code}", 0, 49, withscores=True
    )
    return [
        {"rank": i+1, "display_name": m.split(":")[1],
         "score": int(s), "user_id": m.split(":")[0]}
        for i, (m, s) in enumerate(entries)
    ]

async def record_answer(self, room_code: str, user_id: str,
                        display_name: str, score_earned: int):
    r = await get_redis()
    member = f"{user_id}:{display_name}"
    await r.zincrby(f"game:leaderboard:{room_code}", score_earned, member)