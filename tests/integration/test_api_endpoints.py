import pytest
import httpx

# The base URL of your FastAPI backend running inside Docker
BASE_URL = "http://localhost:8000"

def test_health_endpoint_live():
    response = httpx.get(f"{BASE_URL}/api/health")
    assert response.status_code == 200
    assert "opérationnelle" in response.json()["status"]

# ==========================================
# CHAT ENDPOINT TESTS
# ==========================================

def test_chat_endpoint_validation_error():
    # Sending an empty payload should trigger FastAPI's 422 Unprocessable Entity
    response = httpx.post(f"{BASE_URL}/api/chat/stream", json={})
    assert response.status_code == 422
    assert "detail" in response.json()

def test_chat_endpoint_success():
    # Testing the real LLM streaming endpoint
    payload = {
        "question": "Quels sont les départements de la FSBM ?"
    }
    
    # We use httpx.stream to capture the Server-Sent Events (SSE) data chunks
    with httpx.stream("POST", f"{BASE_URL}/api/chat/stream", json=payload) as response:
        assert response.status_code == 200
        content = response.read().decode("utf-8")
        # Ensure the stream format matches the SSE spec your frontend expects
        assert "data:" in content

# ==========================================
# GENERATE TITLE SCENARIOS
# ==========================================

def test_generate_title_only_prompt():
    # Scenario 1: Only the prompt is provided
    payload = {"prompt": "donne moi l'emploi du temps de la filière SMA"}
    response = httpx.post(f"{BASE_URL}/generate-title", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert data["title"] != "Nouveau Chat"
    assert "language" in data

def test_generate_title_with_valid_language():
    # Scenario 2: Prompt and a valid language provided
    payload = {
        "prompt": "what is the email address of the biology department?",
        "language": "en"
    }
    response = httpx.post(f"{BASE_URL}/generate-title", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] != "Nouveau Chat"
    # Depending on how your backend normalizes it, check for 'en' or 'English'
    assert data["language"] in ["en", "English", "EN"]

def test_generate_title_with_invalid_language():
    # Scenario 3: Prompt with an invalid/unsupported language
    payload = {
        "prompt": "¿Dónde está la biblioteca?",
        "language": "es"
    }
    response = httpx.post(f"{BASE_URL}/generate-title", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    # The system should not crash. It should either fallback to the default (fr) 
    # or return the unsupported language gracefully.
    assert data["language"] in ["fr", "French", "es", "Spanish", None]

def test_generate_title_empty_prompt_exception():
    # Scenario 4: Empty prompt / Gibberish that causes an exception or fallback
    payload = {"prompt": "   "}
    response = httpx.post(f"{BASE_URL}/generate-title", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    # The exception/fallback logic should catch this and return the default title
    assert data["title"] == "Nouveau Chat"