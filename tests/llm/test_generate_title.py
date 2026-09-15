import sys
import os
import pytest
import urllib.request
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.abspath("llm-engine"))
sys.modules["src.chat_engine"] = MagicMock()
sys.modules["src.chat_engine"].get_chat_engine.return_value = MagicMock()

def is_ollama_online():
    try:
        urllib.request.urlopen("http://localhost:11434", timeout=1)
        return True
    except Exception:
        return False

pytestmark = pytest.mark.skipif(
    not is_ollama_online(),
    reason="Ollama daemon is offline"
)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@patch("main.generate_conversation_title", new_callable=AsyncMock)
def test_generate_title_properties_french(mock_title):
    mock_title.return_value = {
        "title": "Emploi du temps SMA",
        "target_language": "French",
        "detected_language": "fr"
    }

    payload = {"prompt": "donne moi l'emploi du temps de la filière SMA"}
    response = client.post("/generate-title", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "language" in data
    assert data["title"] != "Nouveau Chat"
    assert data["language"] == "French"

@patch("main.generate_conversation_title", new_callable=AsyncMock)
def test_generate_title_properties_english(mock_title):
    mock_title.return_value = {
        "title": "Biology Department Email",
        "target_language": "English",
        "detected_language": "en"
    }

    payload = {"prompt": "what is the email address of the biology department?"}
    response = client.post("/generate-title", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] != "Nouveau Chat"
    assert data["language"] == "English"

def test_generate_title_endpoint_empty_prompt():
    response = client.post("/generate-title", json={"prompt": "   "})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Nouveau Chat"