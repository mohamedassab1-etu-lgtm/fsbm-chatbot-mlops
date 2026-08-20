WITH source AS (
    SELECT * FROM {{ source('raw_data', 'emplois') }}
)

SELECT
    section,
    -- On utilise CAST(... AS JSON) pour garantir que Python pourra le décoder !
    CAST({
        'Lundi': {
            '08h30_10h00': CAST(emploi_du_temps__lu___8_h30_10_h AS JSON),
            '10h15_11h45': CAST(emploi_du_temps__lu___10_h15_11_h45 AS JSON),
            '12h00_13h30': CAST(emploi_du_temps__lu___12_h_13_h30 AS JSON),
            '13h45_15h15': CAST(emploi_du_temps__lu___13_h45_15_h15 AS JSON),
            '15h30_17h00': CAST(emploi_du_temps__lu___15_h30_17_h AS JSON)
        },
        'Mardi': {
            '08h30_10h00': CAST(emploi_du_temps__ma___8_h30_10_h AS JSON),
            '10h15_11h45': CAST(emploi_du_temps__ma___10_h15_11_h45 AS JSON),
            '12h00_13h30': CAST(emploi_du_temps__ma___12_h_13_h30 AS JSON),
            '13h45_15h15': CAST(emploi_du_temps__ma___13_h45_15_h15 AS JSON),
            '15h30_17h00': CAST(emploi_du_temps__ma___15_h30_17_h AS JSON)
        },
        'Mercredi': {
            '08h30_10h00': CAST(emploi_du_temps__me___8_h30_10_h AS JSON),
            '10h15_11h45': CAST(emploi_du_temps__me___10_h15_11_h45 AS JSON),
            '12h00_13h30': CAST(emploi_du_temps__me___12_h_13_h30 AS JSON),
            '13h45_15h15': CAST(emploi_du_temps__me___13_h45_15_h15 AS JSON),
            '15h30_17h00': CAST(emploi_du_temps__me___15_h30_17_h AS JSON)
        },
        'Jeudi': {
            '08h30_10h00': CAST(emploi_du_temps__je___8_h30_10_h AS JSON),
            '10h15_11h45': CAST(emploi_du_temps__je___10_h15_11_h45 AS JSON),
            '12h00_13h30': CAST(emploi_du_temps__je___12_h_13_h30 AS JSON),
            '13h45_15h15': CAST(emploi_du_temps__je___13_h45_15_h15 AS JSON),
            '15h30_17h00': CAST(emploi_du_temps__je___15_h30_17_h AS JSON)
        },
        'Vendredi': {
            '08h30_10h00': CAST(emploi_du_temps__ve___8_h30_10_h AS JSON),
            '10h15_11h45': CAST(emploi_du_temps__ve___10_h15_11_h45 AS JSON),
            '12h00_13h30': CAST(emploi_du_temps__ve___12_h_13_h30 AS JSON),
            '13h45_15h15': CAST(emploi_du_temps__ve___13_h45_15_h15 AS JSON),
            '15h30_17h00': CAST(emploi_du_temps__ve___15_h30_17_h AS JSON)
        },
        'Samedi': {
            '08h30_10h00': CAST(emploi_du_temps__sa___8_h30_10_h AS JSON),
            '10h15_11h45': CAST(emploi_du_temps__sa___10_h15_11_h45 AS JSON),
            '12h00_13h30': CAST(emploi_du_temps__sa___12_h_13_h30 AS JSON),
            '13h45_15h15': CAST(emploi_du_temps__sa___13_h45_15_h15 AS JSON),
            '15h30_17h00': CAST(emploi_du_temps__sa___15_h30_17_h AS JSON)
        }
    } AS JSON) AS planning_json
FROM source
WHERE section NOT LIKE 'Template Vide%'