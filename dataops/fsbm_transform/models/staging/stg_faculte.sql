WITH faculte_main AS (
    SELECT * FROM {{ source('raw_data', 'faculte') }}
),
telephones_agg AS (
    SELECT "_dlt_parent_id", list(value) AS liste_telephones
    FROM {{ source('raw_data', 'faculte__contact__telephone') }}
    GROUP BY 1
),
departements_agg AS (
    SELECT "_dlt_parent_id", list(value) AS liste_departements
    FROM {{ source('raw_data', 'faculte__departements_inclus') }}
    GROUP BY 1
)

SELECT
    f.nom_officiel,
    f.acronyme,
    f.universite_de_rattachement,
    f.annee_de_creation,
    f.doyen,
    f.vice_doyen,
    f.description,
    f.contact__adresse AS adresse,
    f.contact__fax AS fax,
    f.contact__site_web AS site_web,
    -- On regroupe les emails dans un objet JSON propre
    CAST({
        'principal': f.contact__emails__principal, 
        'scolarite': f.contact__emails__scolarite, 
        'laboratoire_ia': f.contact__emails__laboratoire_intelligence_artificielle
    } AS VARCHAR) AS emails_json,
    -- On regroupe la localisation
    CAST({
        'ville': f.localisation__ville, 
        'pays': f.localisation__pays, 
        'region': f.localisation__region, 
        'quartier': f.localisation__quartier
    } AS VARCHAR) AS localisation_json,
    -- On rajoute les listes aggrégées
    CAST(t.liste_telephones AS VARCHAR) AS telephones_json,
    CAST(d.liste_departements AS VARCHAR) AS departements_inclus_json
FROM faculte_main f
LEFT JOIN telephones_agg t ON f."_dlt_id" = t."_dlt_parent_id"
LEFT JOIN departements_agg d ON f."_dlt_id" = d."_dlt_parent_id"