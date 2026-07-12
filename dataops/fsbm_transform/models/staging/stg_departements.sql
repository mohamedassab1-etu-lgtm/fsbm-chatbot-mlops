-- models/staging/stg_departements.sql
WITH source AS (
    SELECT * FROM {{ source('raw_data', 'departements') }}
)

SELECT
    nom AS nom_departement,
    chef_de_departement AS chef,
    description AS description_dept
FROM source