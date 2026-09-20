SELECT 
    section
FROM {{ ref('stg_emplois') }}
WHERE 
    LOWER(section) LIKE '%template%' 
    OR LOWER(section) LIKE '%vide%'
    OR (
        regexp_matches(planning_json::VARCHAR, '"type"\s*:\s*"([^"]+)"')
        AND NOT regexp_matches(planning_json::VARCHAR, '"type"\s*:\s*"(COURS|TD|TP|AUTRE)"')
    )