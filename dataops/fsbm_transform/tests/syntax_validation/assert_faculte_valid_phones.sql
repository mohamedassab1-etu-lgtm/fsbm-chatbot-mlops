-- tests/assert_faculte_valid_phones.sql
WITH faculte_phones AS (
    SELECT 
        nom_officiel, 
        trim(unnest(string_split(regexp_replace(telephones_json, '[\[\]''"\{\}]', '', 'g'), ','))) AS phone
    FROM {{ ref('stg_faculte') }}
    WHERE telephones_json IS NOT NULL AND telephones_json NOT IN ('[]', '')
    
    UNION ALL
    
    SELECT 
        nom_officiel, 
        fax AS phone
    FROM {{ ref('stg_faculte') }}
    WHERE fax IS NOT NULL
)

SELECT *
FROM faculte_phones
WHERE phone != ''
  -- Removes all spaces internally, then strictly enforces the Moroccan dialing format
  AND NOT regexp_matches(replace(phone, ' ', ''), '^(\+212|0)[5-7][0-9]{8}$')