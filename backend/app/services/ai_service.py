import httpx
import json
import traceback
import re
from app.core.config import settings
from app.schemas.ai import AIGenerationRequest

class AIService:
    def __init__(self):
        self.api_key = settings.google_api_key
        self.model = "gemini-flash-latest"

    async def generate_questions(self, request: AIGenerationRequest) -> dict:
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY chưa được thiết lập.")

        # Củng cố Prompt cực kỳ nghiêm ngặt
        prompt = f"""
        Bạn là chuyên gia giáo dục. Hãy tạo {request.num_questions} câu hỏi trắc nghiệm về chủ đề: "{request.topic}".
        Độ khó: {request.difficulty}
        Ngôn ngữ: {request.language}

        Yêu cầu trả về JSON chuẩn 100% với cấu trúc:
        {{
          "questions": [
            {{
              "question_text": "Nội dung câu hỏi",
              "question_type": "multiple_choice",
              "time_limit_secs": 30,
              "points": 100,
              "options": [
                {{"option_text": "A", "is_correct": true}},
                {{"option_text": "B", "is_correct": false}},
                {{"option_text": "C", "is_correct": false}},
                {{"option_text": "D", "is_correct": false}}
              ]
            }}
          ]
        }}
        LƯU Ý: Mọi câu hỏi BẮT BUỘC phải có trường "question_type" là "multiple_choice" hoặc "true_false".
        """

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code != 200:
                    raise Exception(f"AI API error: {response.status_code}")

                result = response.json()
                content_text = result["candidates"][0]["content"]["parts"][0]["text"]
                
                json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
                if not json_match:
                    raise ValueError("AI không trả về JSON.")
                
                questions_data = json.loads(json_match.group(0))
                
                # BƯỚC TỰ ĐỘNG SỬA LỖI (Data Repair)
                if "questions" in questions_data:
                    for q in questions_data["questions"]:
                        # Đảm bảo có question_type
                        if "question_type" not in q or not q["question_type"]:
                            q["question_type"] = "multiple_choice"
                        
                        # Đảm bảo có time_limit_secs và points
                        if "time_limit_secs" not in q: q["time_limit_secs"] = 30
                        if "points" not in q: q["points"] = 100
                
                # Gán usage
                usage_info = result.get("usageMetadata", {})
                questions_data["usage"] = {
                    "prompt_tokens": usage_info.get("promptTokenCount", 0),
                    "completion_tokens": usage_info.get("candidatesTokenCount", 0),
                    "total_tokens": usage_info.get("totalTokenCount", 0),
                    "model": self.model
                }
                
                return questions_data
            except Exception as e:
                print(f"--- AI GENERATION ERROR ---")
                traceback.print_exc()
                raise e

ai_service = AIService()
