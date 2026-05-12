import asyncio
import uuid
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def fix_constraints():
    async with AsyncSessionLocal() as session:
        print("Updating Foreign Key constraints for CASCADE deletion...")
        
        commands = [
            # 1. Update GameSession pointing to Quiz
            "ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_quiz_id_fkey",
            "ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE",
            
            # 2. Update PlayerAnswer pointing to Question
            "ALTER TABLE player_answers DROP CONSTRAINT IF EXISTS player_answers_question_id_fkey",
            "ALTER TABLE player_answers ADD CONSTRAINT player_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE",
            
            # 3. Update PlayerAnswer pointing to AnswerOption
            "ALTER TABLE player_answers DROP CONSTRAINT IF EXISTS player_answers_selected_option_fkey",
            "ALTER TABLE player_answers ADD CONSTRAINT player_answers_selected_option_fkey FOREIGN KEY (selected_option) REFERENCES answer_options(id) ON DELETE CASCADE",
            
            # 4. Question pointing to Quiz
            "ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_quiz_id_fkey",
            "ALTER TABLE questions ADD CONSTRAINT questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE",
            
            # 5. AnswerOption pointing to Question
            "ALTER TABLE answer_options DROP CONSTRAINT IF EXISTS answer_options_question_id_fkey",
            "ALTER TABLE answer_options ADD CONSTRAINT answer_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE"
        ]
        
        for cmd in commands:
            try:
                await session.execute(text(cmd))
                print(f"Success: {cmd[:60]}")
            except Exception as e:
                print(f"Error executing: {cmd[:60]} -> {e}")
        
        await session.commit()
        print("\nDone! You can now delete quizzes.")

if __name__ == "__main__":
    asyncio.run(fix_constraints())
