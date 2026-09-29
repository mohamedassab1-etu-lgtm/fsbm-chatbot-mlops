SELECT 
    p.nom_professeur, 
    p.nom_departement
FROM {{ ref('stg_professeurs') }} p
LEFT JOIN {{ ref('stg_departements') }} d 
    ON p.nom_departement = d.nom_departement
WHERE p.nom_departement IS NOT NULL
  AND d.nom_departement IS NULL