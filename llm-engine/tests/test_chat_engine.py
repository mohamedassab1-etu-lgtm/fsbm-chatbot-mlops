from types import SimpleNamespace

from src.chat_engine import (
    best_matching_doc,
    classify_intent_keywords,
    emails_from_doc,
    extract_emails,
    find_forced_docs,
    parse_fields,
)


def test_extract_emails():
    text = "Contact: john.doe@example.com or admin@fsbm.ma"

    result = extract_emails(text)

    assert result == {
        "john.doe@example.com",
        "admin@fsbm.ma",
    }


def test_extract_emails_empty_text():
    assert extract_emails("") == set()


def test_parse_fields():
    content = """Nom : Ahmed Alaoui
Email : ahmed@example.com
Département : Informatique"""

    result = parse_fields(content)

    assert result["nom"] == "Ahmed Alaoui"
    assert result["email"] == "ahmed@example.com"
    assert result["département"] == "Informatique"


def test_emails_from_doc():
    doc = SimpleNamespace(page_content="""Nom : Ahmed Alaoui
Email : ahmed@example.com
Téléphone : 0600000000""")

    result = emails_from_doc(doc)

    assert result == ["ahmed@example.com"]


def test_best_matching_doc():
    doc1 = SimpleNamespace(
        page_content="Information about computer science",
        metadata={"nom": "Informatique"},
    )
    doc2 = SimpleNamespace(
        page_content="Information about mathematics",
        metadata={"nom": "Mathématiques"},
    )

    result = best_matching_doc("Je cherche le département Informatique", [doc1, doc2])

    assert result == doc1


def test_best_matching_doc_no_match():
    doc = SimpleNamespace(
        page_content="Information",
        metadata={"nom": "Informatique"},
    )

    result = best_matching_doc("Bonjour", [doc])

    assert result is None


def test_classify_intent_keywords():
    assert (
        classify_intent_keywords("Qui est le directeur du laboratoire ?")
        == "laboratoire"
    )


def test_classify_intent_keywords_no_match():
    assert classify_intent_keywords("Bonjour, comment allez-vous ?") is None


def test_find_forced_docs():
    doc = SimpleNamespace(
        page_content="Laboratoire LAMS",
        metadata={"acronyme": "LAMS"},
    )

    index = {"lams": doc}

    result = find_forced_docs("Quel est le laboratoire LAMS ?", index)

    assert result == [doc]
