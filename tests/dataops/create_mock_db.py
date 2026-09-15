import duckdb
import os

# Ensure the test directory exists relative to the script
os.makedirs("data/duckdb", exist_ok=True)

# Connect to the isolated test database
conn = duckdb.connect("data/duckdb/fsbm_test.duckdb")

# Create a dummy table representing your extracted university data
conn.execute("""
    CREATE TABLE IF NOT EXISTS academic_data (
        id INTEGER,
        content VARCHAR,
        metadata VARCHAR
    )
""")

# Insert a single test record
conn.execute("""
    INSERT INTO academic_data VALUES 
    (1, 'Emploi du temps de la filière SMA', '{"department": "Mathematics"}')
""")

print("Mock DuckDB database created successfully at tests/dataops/data/duckdb/fsbm_test.duckdb")