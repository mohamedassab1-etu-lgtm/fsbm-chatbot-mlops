import os
import time

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from tqdm import tqdm

from src.loader import load_data_as_documents


def get_device() -> str:
    """Use GPU if available - this alone can be a 5-10x speedup over CPU
    for a model the size of multilingual-e5-large."""
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():  # Apple Silicon
            return "mps"
    except ImportError:
        pass
    return "cpu"


def create_vector_store(batch_size: int = 32):
    duckdb_path = os.getenv("DUCKDB_PATH", "/app/data/duckdb/fsbm.duckdb")
    persist_path = os.getenv("VECTORSTORE_PATH", "/app/vectorstore")

    # 1. Skip if already built
    if os.path.exists(os.path.join(persist_path, "chroma.sqlite3")):
        print("[INFO] Vectorstore already exists. Skipping build.")
        return None

    # 2. Wait for DataOps to finish
    print("[INFO] Waiting for DataOps to generate DuckDB and run dbt...")
    import duckdb
    while True:
        if os.path.exists(duckdb_path):
            try:
                # Test if dbt has actually created the final views
                con = duckdb.connect(duckdb_path, read_only=True)
                con.execute("SELECT 1 FROM clean_data.stg_laboratoires LIMIT 1")
                con.close()
                break # Success! The schema and tables exist.
            except Exception:
                # File exists, but dbt is still running. Keep waiting.
                pass
        time.sleep(5)

    print("Chargement des données depuis DuckDB...")
    docs = load_data_as_documents()
    print(f"-> {len(docs)} documents chargés au total.")

    # Quick breakdown by source so you know where the time is going
    counts = {}
    for d in docs:
        counts[d.metadata.get("source", "?")] = counts.get(d.metadata.get("source", "?"), 0) + 1
    for source, n in counts.items():
        print(f"   - {source}: {n} documents")

    device = get_device()
    print(f"Device utilisé pour l'embedding : {device}", flush=True)

    print("[INFO] Téléchargement / chargement du modèle intfloat/multilingual-e5-large (~2.2 GB en cours)...", flush=True)

    embeddings = HuggingFaceEmbeddings(
        model_name="intfloat/multilingual-e5-large",
        model_kwargs={"device": device},
        encode_kwargs={
            "batch_size": batch_size,
            "normalize_embeddings": True,  # recommended for e5 models (cosine similarity)
        },
    )

    print("[INFO] Modèle d'embedding chargé avec succès !", flush=True)
    print("Création de la base vectorielle (par lots, avec progression)...", flush=True)
    vectorstore = None
    start = time.time()

    total_batches = (len(docs) + batch_size - 1) // batch_size

    for i in range(0, len(docs), batch_size):
        batch_num = (i // batch_size) + 1
        print(f"-> Embedding & Indexation : Lot {batch_num}/{total_batches} en cours...", flush=True)
        
        batch = docs[i:i + batch_size]

        if vectorstore is None:
            vectorstore = Chroma.from_documents(
                documents=batch,
                embedding=embeddings,
                persist_directory=persist_path,
            )
        else:
            vectorstore.add_documents(batch)

    elapsed = time.time() - start
    print(f"Base vectorielle créée avec succès en {elapsed:.1f}s ({len(docs)} documents) !")
    return vectorstore


if __name__ == "__main__":
    create_vector_store()