WITH f_main AS (
    SELECT "_dlt_id", type AS cycle FROM {{ source('raw_data', 'formations') }}
),
f_depts AS (
    SELECT "_dlt_id", "_dlt_parent_id", departement AS nom_departement FROM {{ source('raw_data', 'formations__departements') }}
),
f_filiere AS (
    SELECT "_dlt_id", "_dlt_parent_id", 
           fili_re AS nom_filiere, 
           coordonnateur, 
           sp_cialitx AS specialite, 
           objectifs, 
           d_bouch_s AS debouches, 
           cible,
           domaine,
           description
    FROM {{ source('raw_data', 'formations__departements__formations') }}
),
-- 1. On regroupe les modules par semestre
mod_agg AS (
    SELECT "_dlt_parent_id", list(value) AS liste_modules
    FROM {{ source('raw_data', 'formations__departements__formations__contenu__modules') }}
    GROUP BY 1
),
-- 2. On regroupe les semestres par formation
cont_agg AS (
    SELECT c."_dlt_parent_id", 
           -- On recrée la structure JSON {annee, semestre, modules}
           CAST(list({'annee': c.annee, 'semestre': c.semestre, 'modules': m.liste_modules}) AS VARCHAR) AS modules_json
    FROM {{ source('raw_data', 'formations__departements__formations__contenu') }} c
    LEFT JOIN mod_agg m ON c."_dlt_id" = m."_dlt_parent_id"
    GROUP BY 1
),
-- 3. On regroupe les axes de recherche (pour les doctorats)
axes_agg AS (
    SELECT "_dlt_parent_id", CAST(list(value) AS VARCHAR) AS axes_recherche_json
    FROM {{ source('raw_data', 'formations__departements__formations__axes_de_recherche') }}
    GROUP BY 1
)

SELECT 
    m.cycle,
    d.nom_departement,
    f.nom_filiere,
    f.coordonnateur,
    f.specialite,
    f.objectifs,
    f.debouches,
    f.cible,
    f.domaine,          -- Ajouté pour le doctorat
    f.description,      -- Ajouté pour le doctorat
    c.modules_json,
    a.axes_recherche_json -- Ajouté pour le doctorat
FROM f_main m
JOIN f_depts d ON m."_dlt_id" = d."_dlt_parent_id"
JOIN f_filiere f ON d."_dlt_id" = f."_dlt_parent_id"
LEFT JOIN cont_agg c ON f."_dlt_id" = c."_dlt_parent_id"
LEFT JOIN axes_agg a ON f."_dlt_id" = a."_dlt_parent_id"