-- tests/assert_emplois_logic.sql
SELECT 
    section
FROM {{ ref('stg_emplois') }}
WHERE 
    -- Template Exclusion
    LOWER(section) LIKE '%template%' 
    OR LOWER(section) LIKE '%vide%'
    
    -- Valid Activity Types (Uses Regex negative lookahead to find any type NOT in the approved list)
    OR regexp_matches(planning_json::VARCHAR, '"type"\s*:\s*"(?!(COURS|TD|TP|AUTRE)\b)[^"]+"')