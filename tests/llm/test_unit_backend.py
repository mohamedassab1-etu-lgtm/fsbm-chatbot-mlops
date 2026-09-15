import sys
import os
import pytest
from unittest.mock import MagicMock

# Force Python to prioritize the llm-engine directory
sys.path.insert(0, os.path.abspath("llm-engine"))

# Inject a fake chat_engine into system memory so main.py doesn't crash on import
sys.modules["src.chat_engine"] = MagicMock()
sys.modules["src.chat_engine"].get_chat_engine.return_value = MagicMock()

from main import sse_event, app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_sse_event_format():
    sample = {"type": "delta", "text": "test message"}
    formatted = sse_event(sample)
    assert formatted.startswith("data: ")
    assert formatted.endswith("\n\n")
    assert '"type": "delta"' in formatted

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "opérationnelle" in response.json()["status"]