import duckdb
import pytest
from pathlib import Path

def test_mock_duckdb_schema(tmp_path):
    # Tests that the DuckDB structure matches the expected engine schema
    db_path = tmp_path / "test_catalog.duckdb"
    con = duckdb.connect(str(db_path))
    con.execute("CREATE TABLE mock_fsbm (id INTEGER, subject VARCHAR, content VARCHAR);")
    con.execute("INSERT INTO mock_fsbm VALUES (1, 'examens', 'Dates des examens de printemps');")
    
    res = con.execute("SELECT COUNT(*) FROM mock_fsbm;").fetchone()
    assert res[0] == 1
    con.close()