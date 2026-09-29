WITH extracted_depts AS (
    SELECT 
        trim(unnest(string_split(regexp_replace(departements_inclus_json, '[\[\]''"\{\}]', '', 'g'), ','))) AS nom_dept
    FROM {{ ref('stg_faculte') }}
    WHERE departements_inclus_json IS NOT NULL AND departements_inclus_json NOT IN ('[]', '')
)
SELECT ed.nom_dept
FROM extracted_depts ed
LEFT JOIN {{ ref('stg_departements') }} d 
    ON ed.nom_dept = d.nom_departement
WHERE d.nom_departement IS NULL AND ed.nom_dept != ''