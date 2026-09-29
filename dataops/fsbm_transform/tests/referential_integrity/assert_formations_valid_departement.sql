SELECT 
    f.nom_filiere, 
    f.cycle, 
    f.nom_departement
FROM {{ ref('stg_formations') }} f
LEFT JOIN {{ ref('stg_departements') }} d 
    ON f.nom_departement = d.nom_departement
WHERE d.nom_departement IS NULL