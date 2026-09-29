WITH leadership_roles AS (
    -- Chefs de Départements
    SELECT 'Département' AS entite_type, nom_departement AS nom_entite, chef AS nom_leader
    FROM {{ ref('stg_departements') }}
    WHERE chef IS NOT NULL

    UNION ALL

    -- Coordonnateurs de Formations
    SELECT 'Formation' AS entite_type, nom_filiere AS nom_entite, coordonnateur AS nom_leader
    FROM {{ ref('stg_formations') }}
    WHERE coordonnateur IS NOT NULL

    UNION ALL

    -- Directeurs de Laboratoires
    SELECT 'Laboratoire' AS entite_type, nom_laboratoire AS nom_entite, directeur AS nom_leader
    FROM {{ ref('stg_laboratoires') }}
    WHERE directeur IS NOT NULL
),
normalized_leaders AS (
    SELECT 
        entite_type,
        nom_entite,
        nom_leader,
        trim(lower(nom_leader)) AS clean_leader
    FROM leadership_roles
),
normalized_profs AS (
    SELECT 
        nom_professeur,
        trim(lower(nom_professeur)) AS clean_prof
    FROM {{ ref('stg_professeurs') }}
)

SELECT 
    l.entite_type, 
    l.nom_entite, 
    l.nom_leader
FROM normalized_leaders l
LEFT JOIN normalized_profs p 
    ON l.clean_leader = p.clean_prof
WHERE p.clean_prof IS NULL