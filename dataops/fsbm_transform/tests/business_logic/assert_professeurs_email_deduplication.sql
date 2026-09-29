-- tests/assert_professeurs_email_deduplication.sql
WITH unnested_emails AS (
    SELECT 
        nom_professeur,
        trim(unnest(string_split(regexp_replace(emails_json, '[\[\]''"\{\}]', '', 'g'), ','))) AS email
    FROM {{ ref('stg_professeurs') }}
    WHERE emails_json IS NOT NULL AND emails_json NOT IN ('[]', '')
)

SELECT 
    email, 
    COUNT(*) as apparition_count, 
    list(nom_professeur) as professeurs_concernes
FROM unnested_emails
WHERE email != ''
GROUP BY email
HAVING COUNT(*) > 1