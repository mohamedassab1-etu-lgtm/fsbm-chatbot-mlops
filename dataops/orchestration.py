import os
from pathlib import Path
from dagster import Definitions, AssetOut, Output, multi_asset, AssetKey
from dagster_dbt import DbtCliResource, dbt_assets

import ingest_dlt

# 1. Configuration du chemin vers le projet dbt
DBT_PROJECT_DIR = Path(__file__).parent.joinpath("fsbm_transform").resolve()
DBT_MANIFEST_PATH = DBT_PROJECT_DIR.joinpath("target", "manifest.json")

dbt_resource = DbtCliResource(project_dir=os.fspath(DBT_PROJECT_DIR))

# 2. Liste exacte des 14 tables générées par dlt (déclarées dans ton sources.yml)
dbt_source_tables = [
    "departements",
    "emplois",
    "faculte",
    "faculte__contact__telephone",
    "faculte__departements_inclus",
    "formations",
    "formations__departements",
    "formations__departements__formations",
    "formations__departements__formations__axes_de_recherche",
    "formations__departements__formations__contenu",
    "formations__departements__formations__contenu__modules",
    "laboratoires",
    "laboratoires__equipes",
    "laboratoires__equipes__membres",
    "professeurs"
]

# On crée dynamiquement les sorties pour Dagster. 
# Dagster comprendra que ces sorties s'appellent ["raw_data", "nom_de_la_table"]
dlt_outs = {
    f"out_{i}": AssetOut(key=AssetKey(["raw_data", table]))
    for i, table in enumerate(dbt_source_tables)
}

# 3. L'Asset d'Ingestion devient un "multi_asset"
@multi_asset(outs=dlt_outs)
def raw_fsbm_data():
    """
    Étape 1 : Ingestion des fichiers JSON bruts vers DuckDB via dlt.
    """
    load_info = ingest_dlt.pipeline.run([
        ingest_dlt.get_fsbm_data(),
        ingest_dlt.get_departements_data(),
        ingest_dlt.get_formations_data(),
        ingest_dlt.get_emplois_data(),
        ingest_dlt.get_laboratoires_data(),
        ingest_dlt.get_professeurs_data()
    ])
    
    # On notifie Dagster que chaque table a bien été créée avec succès
    for i, table in enumerate(dbt_source_tables):
        yield Output(value=f"Table {table} chargée", output_name=f"out_{i}")

# 4. L'Asset de Transformation dbt
# Plus besoin de traducteur ! Dagster va lier naturellement les AssetKey ["raw_data", "table"]
@dbt_assets(manifest=DBT_MANIFEST_PATH)
def clean_fsbm_data(context):
    """
    Étape 2 : Transformation, nettoyage et tests des données via dbt.
    """
    yield from dbt_resource.cli(["build"], context=context).stream()

# 5. L'Orchestrateur global
defs = Definitions(
    assets=[raw_fsbm_data, clean_fsbm_data],
    resources={
        "dbt": dbt_resource,
    },
)