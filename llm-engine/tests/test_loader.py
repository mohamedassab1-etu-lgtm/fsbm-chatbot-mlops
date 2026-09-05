from src.loader import (
    normalize_name,
    format_prof_name,
    parse_email_list,
    clean_stray_quotes,
    parse_lab_teams,
)


def test_normalize_name():
    assert normalize_name("BENTAIB MOHSSINE") == "bentaib mohssine"
    assert normalize_name("Pr. Mohssine Bentaib") == "bentaib mohssine"
    assert normalize_name("") == ""


def test_format_prof_name():
    assert format_prof_name("Mohssine Bentaib") == "Pr. Mohssine Bentaib"
    assert format_prof_name("Pr. Mohssine Bentaib") == "Pr. Mohssine Bentaib"


def test_parse_email_list():
    assert parse_email_list("[a@x.com, b@y.com]") == [
        "a@x.com",
        "b@y.com",
    ]

    assert parse_email_list("[]") == []

    assert parse_email_list("") == []

    assert parse_email_list(None) == []


def test_clean_stray_quotes():
    assert clean_stray_quotes("'hello'") == "hello"
    assert clean_stray_quotes("hello") == "hello"


def test_parse_lab_teams():
    assert parse_lab_teams("") == []
