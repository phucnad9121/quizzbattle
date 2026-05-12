import asyncio
from app.db.session import engine
from sqlalchemy import text

async def add_col():
    async with engine.begin() as conn:
        print("Adding forked_from_id column to quizzes table...")
        await conn.execute(text('ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES quizzes(id) ON DELETE SET NULL'))
        print("Successfully added column.")

if __name__ == "__main__":
    asyncio.run(add_col())
