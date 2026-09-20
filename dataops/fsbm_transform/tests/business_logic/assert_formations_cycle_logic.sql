-- tests/assert_formations_cycle_logic.sql
SELECT 
    nom_filiere, 
    cycle
FROM {{ ref('stg_formations') }}
WHERE 
    -- 1. Valid Cycle check
    cycle NOT IN ('Licence Fondamentale', 'Master', 'Doctorat')
    
    -- 2. Doctorat Exclusivity check
    OR (cycle = 'Doctorat' AND (axes_recherche_json IS NULL OR axes_recherche_json = '[]'))
    OR (cycle = 'Doctorat' AND modules_json IS NOT NULL AND modules_json != '[]' AND modules_json NOT LIKE '%"modules": []%')
    
    -- 3. Licence/Master Exclusivity check
    OR (cycle IN ('Licence Fondamentale', 'Master') AND (modules_json IS NULL OR modules_json = '[]' OR modules_json LIKE '%"modules": []%'))
    OR (cycle IN ('Licence Fondamentale', 'Master') AND axes_recherche_json IS NOT NULL AND axes_recherche_json != '[]')