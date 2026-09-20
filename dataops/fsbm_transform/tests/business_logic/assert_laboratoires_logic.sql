-- tests/assert_laboratoires_logic.sql
SELECT 
    nom_laboratoire,
    directeur,
    directeur_adjoint,
    equipes_json
FROM {{ ref('stg_laboratoires') }}
WHERE 
    -- Leadership Separation
    (directeur IS NOT NULL AND directeur = directeur_adjoint)
    
    -- Team Validations
    OR (equipes_json IS NULL OR equipes_json = '[]' OR equipes_json = '')