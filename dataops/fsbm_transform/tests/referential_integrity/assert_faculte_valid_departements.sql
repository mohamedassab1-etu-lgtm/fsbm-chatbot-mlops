WITH unnested_depts AS (
    SELECT 
        nom_officiel, 
        unnest(from_json(departements_inclus_json, 'VARCHAR[]')) AS nom_departement
    FROM {{ ref('stg_faculte') }}
    WHERE departements_inclus_json IS NOT NULL
)

SELECT 
    u.nom_officiel, 
    u.nom_departement
FROM unnested_depts u
LEFT JOIN {{ ref('stg_departements') }} d 
    ON u.nom_departement = d.nom_departement
WHERE d.nom_departement IS NULL