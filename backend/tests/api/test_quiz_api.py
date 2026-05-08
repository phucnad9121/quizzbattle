import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_quiz(client: AsyncClient, auth_headers: dict, test_user):
    payload = {
        "title": "My Test Quiz",
        "description": "Test Desc",
        "is_public": True
    }
    response = await client.post("/api/v1/quizzes", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "My Test Quiz"
    assert data["owner_id"] == str(test_user.id)
    assert data["is_public"] is True

@pytest.mark.asyncio
async def test_create_quiz_unauthorized(client: AsyncClient):
    response = await client.post("/api/v1/quizzes", json={"title": "No Auth"})
    assert response.status_code == 401

import asyncio

@pytest.mark.asyncio
async def test_list_quizzes(client: AsyncClient, auth_headers: dict):
    # Create multiple quizzes
    await client.post("/api/v1/quizzes", json={"title": "Quiz 1"}, headers=auth_headers)
    await asyncio.sleep(0.05)
    await client.post("/api/v1/quizzes", json={"title": "Quiz 2"}, headers=auth_headers)
    
    response = await client.get("/api/v1/quizzes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    
    titles = {q["title"] for q in data["items"]}
    assert titles == {"Quiz 1", "Quiz 2"}

@pytest.mark.asyncio
async def test_get_quiz_detail(client: AsyncClient, auth_headers: dict):
    res = await client.post("/api/v1/quizzes", json={"title": "Detail Quiz", "is_public": False}, headers=auth_headers)
    quiz_id = res.json()["id"]
    
    # Owner fetch
    res = await client.get(f"/api/v1/quizzes/{quiz_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Detail Quiz"

@pytest.mark.asyncio
async def test_get_quiz_forbidden(client: AsyncClient, auth_headers: dict, other_auth_headers: dict):
    res = await client.post("/api/v1/quizzes", json={"title": "Private Quiz", "is_public": False}, headers=auth_headers)
    quiz_id = res.json()["id"]
    
    # Other user fetch private -> 403
    res_other = await client.get(f"/api/v1/quizzes/{quiz_id}", headers=other_auth_headers)
    assert res_other.status_code == 403

@pytest.mark.asyncio
async def test_update_quiz(client: AsyncClient, auth_headers: dict, other_auth_headers: dict):
    res = await client.post("/api/v1/quizzes", json={"title": "Old Title"}, headers=auth_headers)
    quiz_id = res.json()["id"]
    
    # Update title
    update_res = await client.patch(f"/api/v1/quizzes/{quiz_id}", json={"title": "New Title"}, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "New Title"
    
    # Non-owner update -> 403
    forbidden_res = await client.patch(f"/api/v1/quizzes/{quiz_id}", json={"title": "Hacked"}, headers=other_auth_headers)
    assert forbidden_res.status_code == 403

@pytest.mark.asyncio
async def test_delete_quiz(client: AsyncClient, auth_headers: dict, other_auth_headers: dict):
    res = await client.post("/api/v1/quizzes", json={"title": "To Delete"}, headers=auth_headers)
    quiz_id = res.json()["id"]
    
    # Non-owner delete -> 403
    del_forbidden = await client.delete(f"/api/v1/quizzes/{quiz_id}", headers=other_auth_headers)
    assert del_forbidden.status_code == 403
    
    # Owner delete -> 204
    del_res = await client.delete(f"/api/v1/quizzes/{quiz_id}", headers=auth_headers)
    assert del_res.status_code == 204
    
    # Fetch -> 404
    fetch_res = await client.get(f"/api/v1/quizzes/{quiz_id}", headers=auth_headers)
    assert fetch_res.status_code == 404

# --- Question Tests ---

@pytest.mark.asyncio
async def test_create_question(client: AsyncClient, auth_headers: dict):
    quiz_res = await client.post("/api/v1/quizzes", json={"title": "Quiz"}, headers=auth_headers)
    quiz_id = quiz_res.json()["id"]
    
    payload = {
        "question_text": "1+1?",
        "question_type": "multiple_choice",
        "time_limit_secs": 10,
        "points": 100,
        "options": [
            {"option_text": "1", "is_correct": False},
            {"option_text": "2", "is_correct": True},
            {"option_text": "3", "is_correct": False}
        ]
    }
    res = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json=payload, headers=auth_headers)
    assert res.status_code == 201
    q_data = res.json()
    assert q_data["question_text"] == "1+1?"
    assert len(q_data["options"]) == 3
    assert q_data["order_index"] == 0

@pytest.mark.asyncio
async def test_question_validation(client: AsyncClient, auth_headers: dict):
    quiz_res = await client.post("/api/v1/quizzes", json={"title": "Quiz"}, headers=auth_headers)
    quiz_id = quiz_res.json()["id"]
    
    # Invalid time_limit
    res1 = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "question_text": "Test", "question_type": "multiple_choice", "time_limit_secs": 200, "points": 100,
        "options": [{"option_text": "A", "is_correct": True}, {"option_text": "B", "is_correct": False}]
    }, headers=auth_headers)
    assert res1.status_code == 422
    
    # Multiple choice with no correct options
    res2 = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "question_text": "Test", "question_type": "multiple_choice", "time_limit_secs": 10, "points": 100,
        "options": [{"option_text": "A", "is_correct": False}, {"option_text": "B", "is_correct": False}]
    }, headers=auth_headers)
    assert res2.status_code == 422

    # True/False with wrong text
    res3 = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "question_text": "Test", "question_type": "true_false", "time_limit_secs": 10, "points": 100,
        "options": [{"option_text": "Yes", "is_correct": True}, {"option_text": "No", "is_correct": False}]
    }, headers=auth_headers)
    assert res3.status_code == 422

@pytest.mark.asyncio
async def test_update_question(client: AsyncClient, auth_headers: dict, other_auth_headers: dict):
    quiz_res = await client.post("/api/v1/quizzes", json={"title": "Quiz"}, headers=auth_headers)
    quiz_id = quiz_res.json()["id"]
    q_res = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
        "question_text": "Old", "question_type": "true_false", "time_limit_secs": 10, "points": 100,
        "options": [{"option_text": "Đúng", "is_correct": True}, {"option_text": "Sai", "is_correct": False}]
    }, headers=auth_headers)
    q_id = q_res.json()["id"]
    
    # Update only points
    res_upd = await client.patch(f"/api/v1/questions/{q_id}", json={"points": 200}, headers=auth_headers)
    assert res_upd.status_code == 200
    assert res_upd.json()["points"] == 200
    assert len(res_upd.json()["options"]) == 2
    
    # Non-owner update -> 403
    res_forb = await client.patch(f"/api/v1/questions/{q_id}", json={"points": 300}, headers=other_auth_headers)
    assert res_forb.status_code == 403

@pytest.mark.asyncio
async def test_delete_and_reorder_questions(client: AsyncClient, auth_headers: dict):
    quiz_res = await client.post("/api/v1/quizzes", json={"title": "Quiz"}, headers=auth_headers)
    quiz_id = quiz_res.json()["id"]
    
    q_ids = []
    for i in range(3):
        res = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
            "question_text": f"Q{i}", "question_type": "true_false", "time_limit_secs": 10, "points": 100,
            "options": [{"option_text": "Đúng", "is_correct": True}, {"option_text": "Sai", "is_correct": False}]
        }, headers=auth_headers)
        q_ids.append(res.json()["id"])
        
    # Delete middle question (q_ids[1])
    del_res = await client.delete(f"/api/v1/questions/{q_ids[1]}", headers=auth_headers)
    assert del_res.status_code == 204
    
    # Fetch quiz and check order
    quiz_detail = await client.get(f"/api/v1/quizzes/{quiz_id}", headers=auth_headers)
    questions = quiz_detail.json()["questions"]
    assert len(questions) == 2
    # Q0 should be index 0
    assert questions[0]["question_text"] == "Q0"
    assert questions[0]["order_index"] == 0
    # Q2 should be index 1
    assert questions[1]["question_text"] == "Q2"
    assert questions[1]["order_index"] == 1

@pytest.mark.asyncio
async def test_manual_reorder_questions(client: AsyncClient, auth_headers: dict):
    quiz_res = await client.post("/api/v1/quizzes", json={"title": "Quiz"}, headers=auth_headers)
    quiz_id = quiz_res.json()["id"]
    
    q_ids = []
    for i in range(3):
        res = await client.post(f"/api/v1/quizzes/{quiz_id}/questions", json={
            "question_text": f"Q{i}", "question_type": "true_false", "time_limit_secs": 10, "points": 100,
            "options": [{"option_text": "Đúng", "is_correct": True}, {"option_text": "Sai", "is_correct": False}]
        }, headers=auth_headers)
        q_ids.append(res.json()["id"])
        
    # Reverse order: 2, 1, 0
    new_order = [q_ids[2], q_ids[1], q_ids[0]]
    res = await client.put(f"/api/v1/quizzes/{quiz_id}/questions/reorder", json={"question_ids": new_order}, headers=auth_headers)
    assert res.status_code == 200
    
    questions = res.json()["questions"]
    assert questions[0]["id"] == new_order[0]
    assert questions[0]["order_index"] == 0
    assert questions[1]["id"] == new_order[1]
    assert questions[1]["order_index"] == 1
    assert questions[2]["id"] == new_order[2]
    assert questions[2]["order_index"] == 2
