import dlt
import json
import os

# Configuration des chemins
RAW_JSON_DIR = "../data/raw_json/"
DUCKDB_PATH = "../data/duckdb/fsbm.duckdb"

# 1. Initialisation du pipeline dlt
pipeline = dlt.pipeline(
    pipeline_name="fsbm_ingestion",
    destination=dlt.destinations.duckdb(credentials=DUCKDB_PATH),
    dataset_name="raw_data" 
)
# Fonction utilitaire pour lire les JSON
def load_json(filename):
    filepath = os.path.join(RAW_JSON_DIR, filename)
    if not os.path.exists(filepath):
        print(f"⚠️ Fichier introuvable : {filepath}")
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

# 2. Définition des Ressources (Une ressource = Une table principale dans DuckDB)

@dlt.resource(name="faculte", write_disposition="replace")
def get_fsbm_data():
    """Extrait les informations générales de la faculté"""
    data = load_json("fsbm.json")
    if data and "faculte" in data:
        # On yield un seul dictionnaire qui deviendra une ligne dans la table 'faculte'
        yield data["faculte"]

@dlt.resource(name="departements", write_disposition="replace")
def get_departements_data():
    """Extrait la liste des départements"""
    data = load_json("departements.json")
    if data and "departements" in data:
        # dlt va créer une ligne pour chaque élément de cette liste
        yield data["departements"]

@dlt.resource(name="formations", write_disposition="replace")
def get_formations_data():
    """Extrait la hiérarchie des formations (Licences, Masters, Doc)"""
    data = load_json("formations.json")
    if data:
        yield data

@dlt.resource(name="emplois", write_disposition="replace")
def get_emplois_data():
    """Extrait les emplois du temps par section"""
    data = load_json("emplois.json")
    if data:
        yield data

@dlt.resource(name="laboratoires", write_disposition="replace")
def get_laboratoires_data():
    """Extrait la liste des laboratoires et leurs équipes"""
    data = load_json("laboratoires.json")
    if data:
        yield data


if __name__ == "__main__":
    print("[INFO] Démarrage de l'ingestion dlt vers DuckDB...")
    
    # 3. Exécution du pipeline avec toutes nos ressources
    load_info = pipeline.run([
        get_fsbm_data(),
        get_departements_data(),
        get_formations_data(),
        get_emplois_data(),
        get_laboratoires_data()
    ])
    
    print("\n[SUCCESS] Ingestion terminée avec succès !")
    print(load_info)