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
    print(f"Device utilisé pour l'embedding : {device}")

    embeddings = HuggingFaceEmbeddings(
        model_name="intfloat/multilingual-e5-large",
        model_kwargs={"device": device},
        encode_kwargs={
            "batch_size": batch_size,
            "normalize_embeddings": True,  # recommended for e5 models (cosine similarity)
        },
    )

    persist_path = "../data/vector_db"

    print("Création de la base vectorielle (par lots, avec progression)...")
    vectorstore = None
    start = time.time()

    for i in tqdm(range(0, len(docs), batch_size), desc="Embedding + indexation", unit="batch"):
        batch = docs[i:i + batch_size]

        if vectorstore is None:
            # First batch creates the collection
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