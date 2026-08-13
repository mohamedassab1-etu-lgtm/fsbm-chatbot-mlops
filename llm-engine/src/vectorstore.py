from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from src.loader import load_data_as_documents

def create_vector_store():
    # 1. Charger les documents depuis DuckDB
    print("Chargement des données depuis DuckDB...")
    docs = load_data_as_documents()
    
    # 2. Utiliser un modèle d'embedding local (gratuit, rapide, privé)
    # Tu peux changer 'all-MiniLM-L6-v2' pour un modèle plus puissant si besoin
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    persist_path = "../data/vector_db"
    
    # 3. Créer la base vectorielle ChromaDB
    print("Création de la base vectorielle...")
    vectorstore = Chroma.from_documents(
        documents=docs, 
        embedding=embeddings,
        persist_directory=persist_path
    )
    
    print("Base vectorielle créée avec succès !")
    return vectorstore

if __name__ == "__main__":
    create_vector_store()