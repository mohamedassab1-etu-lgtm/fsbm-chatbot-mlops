from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama

from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains.retrieval import create_retrieval_chain


def get_chat_engine():
    # Embeddings
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )

    # Vector database
    vectorstore = Chroma(
        persist_directory="../data/vector_db",
        embedding_function=embeddings,
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    # Ollama model
    llm = ChatOllama(model="llama3.2:1b", temperature=0.3)

    # Prompt amélioré pour forcer une réponse humaine
    prompt = ChatPromptTemplate.from_template(
        """
Tu es un assistant virtuel expert de la Faculté des Sciences Ben M'Sik (FSBM).
Ton rôle est d'aider les étudiants et les visiteurs avec des réponses claires, professionnelles et naturelles.

Règles de comportement :
1. Réponds toujours avec un ton naturel, humain et convivial.
2. N'affiche jamais de code JSON, de structures de données ou de crochets bruts. 
3. Synthétise les informations : si tu trouves une liste de membres ou des données techniques, transforme-les en une phrase ou une liste à puces lisible.
4. Si la réponse n'est pas dans le contexte, dis poliment que tu ne disposes pas de l'information.
5. Sois concis mais complet.

Contexte fourni :
{context}

Question de l'utilisateur :
{input}

Réponse de l'assistant :
"""
    )

    document_chain = create_stuff_documents_chain(
        llm,
        prompt,
    )

    chain = create_retrieval_chain(
        retriever,
        document_chain,
    )

    return chain


if __name__ == "__main__":
    bot = get_chat_engine()

    print("Chatbot FSBM prêt ! Pose ta question :")
    while True:
        query = input("> ")
        if query.lower() in ("quit", "exit"):
            break
        
        print("IA: ", end="", flush=True)
        # On utilise .stream() au lieu de .invoke()
        for chunk in bot.stream({"input": query}):
            if "answer" in chunk:
                print(chunk["answer"], end="", flush=True)
        print("\n") # Nouvelle ligne après la réponse