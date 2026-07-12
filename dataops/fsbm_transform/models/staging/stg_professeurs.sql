-- models/staging/stg_professeurs.sql
WITH source AS (
    SELECT * FROM {{ source('raw_data', 'professeurs') }}
)

SELECT
    name AS nom_professeur,
    status AS statut,
    linkedin_url,
    email,
    scopus_profile_url,
    biography AS biographie,
    departement_name AS nom_departement
FROM source