import sys
import os
import pytest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath("llm-engine"))
sys.modules["src.chat_engine"] = MagicMock()
sys.modules["src.chat_engine"].get_chat_engine.return_value = MagicMock()

from src.generate_title import detect_language 

@pytest.mark.asyncio
async def test_detect_language_french():
    lang_info = await detect_language("donne moi l'emploi du temps de la filière SMA")
    assert lang_info["language"] == "French"

@pytest.mark.asyncio
async def test_detect_language_english():
    lang_info = await detect_language("what is the email address of the biology department?")
    assert lang_info["language"] == "English"

@pytest.mark.asyncio
async def test_detect_language_arabic():
    lang_info = await detect_language("ما هي مختبرات كلية العلوم بن مسيك؟")
    assert lang_info["language"] == "Arabic"

@pytest.mark.asyncio
async def test_detect_language_unsupported_spanish():
    lang_info = await detect_language("Hola, ¿dónde está la biblioteca?")
    assert lang_info["language"] == "French"

@pytest.mark.asyncio
async def test_detect_language_empty_or_gibberish():
    lang_info = await detect_language("   ")
    assert lang_info["language"] == "French"