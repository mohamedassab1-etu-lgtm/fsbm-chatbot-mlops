-- tests/assert_valid_email_syntax.sql
WITH prof_emails AS (
    SELECT 
        'Professeur' AS entite_type,
        nom_professeur AS nom_entite,
        trim(unnest(string_split(regexp_replace(emails_json, '[\[\]''"\{\}]', '', 'g'), ','))) AS email
    FROM {{ ref('stg_professeurs') }}
    WHERE emails_json IS NOT NULL AND emails_json NOT IN ('[]', '')
),
faculte_emails AS (
    SELECT 
        'Faculte' AS entite_type,
        nom_officiel AS nom_entite,
        trim(unnest(string_split(regexp_replace(emails_json, '[\[\]''"\{\}]', '', 'g'), ','))) AS email
    FROM {{ ref('stg_faculte') }}
    WHERE emails_json IS NOT NULL AND emails_json NOT IN ('[]', '')
),
all_emails AS (
    SELECT * FROM prof_emails
    UNION ALL
    SELECT * FROM faculte_emails
)

SELECT *
FROM all_emails
WHERE email != ''
  -- Cleans key prefixes like 'principal:' before applying the email regex
  AND NOT regexp_matches(regexp_replace(email, '^.*:\s*', ''), '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')