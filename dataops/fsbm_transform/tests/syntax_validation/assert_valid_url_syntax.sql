-- tests/assert_valid_url_syntax.sql
WITH urls_to_check AS (
    SELECT 'Professeur (LinkedIn)' AS source, nom_professeur AS entite, linkedin_url AS url 
    FROM {{ ref('stg_professeurs') }} WHERE linkedin_url IS NOT NULL
    
    UNION ALL
    
    SELECT 'Professeur (Scopus)' AS source, nom_professeur AS entite, scopus_profile_url AS url 
    FROM {{ ref('stg_professeurs') }} WHERE scopus_profile_url IS NOT NULL
    
    UNION ALL
    
    SELECT 'Faculte (Site Web)' AS source, nom_officiel AS entite, site_web AS url 
    FROM {{ ref('stg_faculte') }} WHERE site_web IS NOT NULL
)

SELECT *
FROM urls_to_check
WHERE NOT regexp_matches(url, '^(https?://|www\.)')