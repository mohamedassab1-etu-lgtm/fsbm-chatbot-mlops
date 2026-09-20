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
)

SELECT 
    l.entite_type, 
    l.nom_entite, 
    l.nom_leader
FROM leadership_roles l
LEFT JOIN {{ ref('stg_professeurs') }} p 
    ON l.nom_leader = p.nom_professeur
WHERE p.nom_professeur IS NULL