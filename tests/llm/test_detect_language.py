import sys
import os
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath("llm-engine"))
sys.modules["src.chat_engine"] = MagicMock()
sys.modules["src.chat_engine"].get_chat_engine.return_value = MagicMock()

from main import detect_language 

def test_detect_language_french():
    lang = detect_language("donne moi l'emploi du temps de la filière SMA")
    assert lang == "fr"

def test_detect_language_english():
    lang = detect_language("what is the email address of the biology department?")
    assert lang == "en"

def test_detect_language_arabic():
    lang = detect_language("ما هي مختبرات كلية العلوم بن مسيك؟")
    assert lang == "ar"

def test_detect_language_unsupported_spanish():
    lang = detect_language("Hola, ¿dónde está la biblioteca?")
    assert lang in ["fr", None] 

def test_detect_language_empty_or_gibberish():
    lang = detect_language("   ")
    assert lang in ["fr", None, ""]