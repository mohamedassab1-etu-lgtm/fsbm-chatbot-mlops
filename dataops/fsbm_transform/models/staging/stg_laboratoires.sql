WITH lab_main AS (
    SELECT 
        "_dlt_id",
        title AS nom_laboratoire,
        description,
        directeur,
        directeur_adjoint
    FROM {{ source('raw_data', 'laboratoires') }}
),

-- 1. On regroupe les membres par équipe (création d'une structure JSON pour chaque membre)
membres_agg AS (
    SELECT 
        "_dlt_parent_id", 
        list({'nom_membre': name, 'role': role}) AS liste_membres
    FROM {{ source('raw_data', 'laboratoires__equipes__membres') }}
    GROUP BY 1
),

-- 2. On regroupe les équipes (avec la liste de leurs membres) par laboratoire
equipes_agg AS (
    SELECT 
        e."_dlt_parent_id",
        CAST(list({'nom_equipe': e.name, 'membres': m.liste_membres}) AS VARCHAR) AS equipes_json
    FROM {{ source('raw_data', 'laboratoires__equipes') }} e
    LEFT JOIN membres_agg m ON e."_dlt_id" = m."_dlt_parent_id"
    GROUP BY 1
)

-- 3. On rassemble tout
SELECT
    l.nom_laboratoire,
    l.description,
    l.directeur,
    l.directeur_adjoint,
    e.equipes_json
FROM lab_main l
LEFT JOIN equipes_agg e ON l."_dlt_id" = e."_dlt_parent_id"