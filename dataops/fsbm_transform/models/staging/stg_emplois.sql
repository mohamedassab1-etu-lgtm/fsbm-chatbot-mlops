WITH source AS (
    SELECT * FROM {{ source('raw_data', 'emplois') }}
)

SELECT
    section,
    -- On reconstruit un objet JSON propre pour le LLM
    CAST({
        'Lundi': {
            '08h30_10h00': emploi_du_temps__lu___8_h30_10_h,
            '10h15_11h45': emploi_du_temps__lu___10_h15_11_h45,
            '12h00_13h30': emploi_du_temps__lu___12_h_13_h30,
            '13h45_15h15': emploi_du_temps__lu___13_h45_15_h15,
            '15h30_17h00': emploi_du_temps__lu___15_h30_17_h
        },
        'Mardi': {
            '08h30_10h00': emploi_du_temps__ma___8_h30_10_h,
            '10h15_11h45': emploi_du_temps__ma___10_h15_11_h45,
            '12h00_13h30': emploi_du_temps__ma___12_h_13_h30,
            '13h45_15h15': emploi_du_temps__ma___13_h45_15_h15,
            '15h30_17h00': emploi_du_temps__ma___15_h30_17_h
        },
        'Mercredi': {
            '08h30_10h00': emploi_du_temps__me___8_h30_10_h,
            '10h15_11h45': emploi_du_temps__me___10_h15_11_h45,
            '12h00_13h30': emploi_du_temps__me___12_h_13_h30,
            '13h45_15h15': emploi_du_temps__me___13_h45_15_h15,
            '15h30_17h00': emploi_du_temps__me___15_h30_17_h
        },
        'Jeudi': {
            '08h30_10h00': emploi_du_temps__je___8_h30_10_h,
            '10h15_11h45': emploi_du_temps__je___10_h15_11_h45,
            '12h00_13h30': emploi_du_temps__je___12_h_13_h30,
            '13h45_15h15': emploi_du_temps__je___13_h45_15_h15,
            '15h30_17h00': emploi_du_temps__je___15_h30_17_h
        },
        'Vendredi': {
            '08h30_10h00': emploi_du_temps__ve___8_h30_10_h,
            '10h15_11h45': emploi_du_temps__ve___10_h15_11_h45,
            '12h00_13h30': emploi_du_temps__ve___12_h_13_h30,
            '13h45_15h15': emploi_du_temps__ve___13_h45_15_h15,
            '15h30_17h00': emploi_du_temps__ve___15_h30_17_h
        },
        'Samedi': {
            '08h30_10h00': emploi_du_temps__sa___8_h30_10_h,
            '10h15_11h45': emploi_du_temps__sa___10_h15_11_h45,
            '12h00_13h30': emploi_du_temps__sa___12_h_13_h30,
            '13h45_15h15': emploi_du_temps__sa___13_h45_15_h15,
            '15h30_17h00': emploi_du_temps__sa___15_h30_17_h
        }
    } AS VARCHAR) AS planning_json
FROM source
-- On nettoie les lignes vides inutiles
WHERE section NOT LIKE 'Template Vide%'