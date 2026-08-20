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
    """Extracts the schedule and serializes complex arrays to prevent dlt sub-tables"""
    data = load_json("emplois_final.json")
    
    day_map = {'LU': 'lu', 'MA': 'ma', 'ME': 'me', 'JE': 'je', 'VE': 've', 'SA': 'sa'}
    hour_map = {
        '8H30 / 10H': '8_h30_10_h',
        '10H15 / 11H45': '10_h15_11_h45',
        '12H / 13H30': '12_h_13_h30',
        '13H45 / 15H15': '13_h45_15_h15',
        '15H30 / 17H': '15_h30_17_h'
    }

    if data:
        for row in data:
            section = row.get("section")
            if not section or "Template" in section:
                continue
            
            flat_row = {"section": section}
            emploi = row.get("emploi_du_temps", {})
            
            for jour, creneaux in emploi.items():
                j = day_map.get(jour)
                if not j: continue
                
                for heure, liste_cours in creneaux.items():
                    h_col = hour_map.get(heure)
                    if not h_col: continue
                    
                    # Match your exact SQL column naming convention
                    col_name = f"emploi_du_temps__{j}___{h_col}"
                    
                    # Serialize the list of dicts into a JSON string
                    flat_row[col_name] = json.dumps(liste_cours, ensure_ascii=False)
            
            yield flat_row

@dlt.resource(name="laboratoires", write_disposition="replace")
def get_laboratoires_data():
    """Extrait la liste des laboratoires et leurs équipes"""
    data = load_json("laboratoires.json")
    if data:
        yield data

@dlt.resource(name="professeurs", write_disposition="replace")
def get_professeurs_data():
    """Extrait la liste des professeurs et leurs informations"""
    data = load_json("professeurs.json")
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
        get_laboratoires_data(),
        get_professeurs_data()
    ])
    
    print("\n[SUCCESS] Ingestion terminée avec succès !")
    print(load_info)