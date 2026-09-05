from fastapi.testclient import TestClient
from main import app 

client = TestClient(app)

def test_generate_title_properties_french():
    payload = {"prompt": "donne moi l'emploi du temps de la filière SMA"}
    response = client.post("/generate-title", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    # 1. Structural Checks
    assert "title" in data, "Response missing 'title' key"
    assert "language" in data, "Response missing 'language' key"
    
    title = data["title"]
    
    # 2. Fallback Check (Should not fail to default)
    assert title != "Nouveau Chat", "LLM failed and returned the default fallback"
    
    # 3. Length Constraints (Prompt asks for 3-5 words, we allow up to 8 for flexibility)
    word_count = len(title.split())
    assert 1 <= word_count <= 8, f"Title length out of bounds: {word_count} words ('{title}')"
    
    # 4. Language Routing Check
    assert data["language"] == "French", f"Expected French, got {data['language']}"

def test_generate_title_properties_english():
    payload = {"prompt": "what is the email address of the biology department?"}
    response = client.post("/generate-title", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["title"] != "Nouveau Chat"
    assert data["language"] == "English", f"Expected English, got {data['language']}"

def test_generate_title_endpoint_empty_prompt():
    # An empty or whitespace prompt should instantly trigger the fallback guardrail
    response = client.post("/generate-title", json={"prompt": "   "})
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify the hardcoded fallback is working perfectly
    assert data["title"] == "Nouveau Chat"