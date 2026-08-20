WITH prof_main AS (
    SELECT * FROM {{ source('raw_data', 'professeurs') }}
),
emails_agg AS (
    SELECT "_dlt_parent_id", list(value) AS liste_emails
    FROM {{ source('raw_data', 'professeurs__email') }}
    GROUP BY 1
)

SELECT
    p.name AS nom_professeur,
    p.status AS statut,
    p.linkedin_url,
    CAST(e.liste_emails AS VARCHAR) AS emails_json,
    p.scopus_profile_url,
    p.biography AS biographie,
    p.departement_name AS nom_departement
FROM prof_main p
LEFT JOIN emails_agg e ON p."_dlt_id" = e."_dlt_parent_id"