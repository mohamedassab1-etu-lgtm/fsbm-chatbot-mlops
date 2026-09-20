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

def test_metrics_endpoint_exists():
    """
    Test that the Prometheus instrumentator successfully exposed the /metrics endpoint.
    """
    response = client.get("/metrics")
    
    assert response.status_code == 200
    
    assert "text/plain" in response.headers.get("content-type", "")
    
    assert "llm_tokens_generated_total" in response.text

def test_internal_sse_event_formatter():
    """
    Test the internal _sse_event formatter function used by the streaming endpoint.
    """
    from main import _sse_event
    
    formatted = _sse_event("delta", "mot")
    
    assert formatted.startswith("data: ")
    assert formatted.endswith("\n\n")
    
    assert '"type": "delta"' in formatted
    assert '"text": "mot"' in formatted