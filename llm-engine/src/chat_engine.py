from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains.retrieval import create_retrieval_chain


# ---------------------------------------------------------------------------
# 1. Intent classification -> metadata["type"]
# ---------------------------------------------------------------------------
# These MUST match the values set in metadata={"type": ...} inside loader.py
VALID_TYPES = [
    "professeur",
    "formation",
    "laboratoire",
    "emploi_du_temps",
    "departement",
    "etablissement",
]

# Keyword bank per type. Keep these lowercase; matching is done on a
# lowercased question. Feel free to extend these lists as you see
# misclassifications in practice.
TYPE_KEYWORDS = {
    "professeur": [
        "professeur", "prof ", "prof.", "enseignant", "chercheur",
        "email", "e-mail", "linkedin", "scopus", "biographie",
        "statut", "grade", "coordonnées de",
    ],
    "formation": [
        "licence", "master", "filière", "filiere", "spécialité", "specialite",
        "formation", "cursus", "module", "débouché", "debouche",
        "objectif", "coordonnateur", "responsable de la formation",
        "condition d'admission", "public cible",
    ],
    "laboratoire": [
        "laboratoire", "labo", "équipe de recherche", "equipe de recherche",
        "directeur du laboratoire", "axe de recherche", "membres de l'équipe",
    ],
    "emploi_du_temps": [
        "emploi du temps", "planning", "horaire", "emplois",
        "séance", "seance", "salle", "créneau", "creneau",
        "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
        "cours du", "td de", "tp de",
    ],
    "departement": [
        "département", "departement", "chef de département", "chef de departement",
    ],
    "etablissement": [
        "doyen", "vice-doyen", "vice doyen", "adresse de la faculté",
        "contact de la faculté", "fsbm", "année de création", "annee de creation",
        "université de rattachement", "universite de rattachement",
        "site web", "téléphone de la faculté",
    ],
}

CLASSIFICATION_PROMPT = ChatPromptTemplate.from_template(
    """Tu es un classificateur d'intentions pour un chatbot universitaire.
Classe la question suivante dans EXACTEMENT une des catégories ci-dessous.
Réponds uniquement avec le mot de la catégorie, sans aucune ponctuation ni explication.

Catégories possibles :
- professeur : question sur un enseignant/chercheur (contact, biographie, statut, département de rattachement)
- formation : question sur une licence, un master, une filière, ses modules, débouchés, coordonnateur
- laboratoire : question sur un laboratoire de recherche, ses équipes, son directeur
- emploi_du_temps : question sur un horaire, planning, cours, séance, salle
- departement : question sur un département académique, son chef, ses missions
- etablissement : question générale sur la FSBM (doyen, adresse, contact, université de rattachement)
- autre : si aucune catégorie ne correspond clairement

Question : {question}

Catégorie :"""
)


def classify_intent_keywords(question: str) -> str | None:
    """Fast, deterministic classification based on keyword matching.
    Returns None if no keywords matched (ambiguous)."""
    q = question.lower()
    scores = {t: 0 for t in VALID_TYPES}
    for type_name, keywords in TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                scores[type_name] += 1

    best_type = max(scores, key=scores.get)
    if scores[best_type] == 0:
        return None
    return best_type


def classify_intent_llm(question: str, llm) -> str | None:
    """Fallback classification using the LLM itself, for questions the
    keyword classifier couldn't confidently place."""
    chain = CLASSIFICATION_PROMPT | llm
    result = chain.invoke({"question": question})
    label = result.content.strip().lower()
    return label if label in VALID_TYPES else None


def classify_intent(question: str, llm) -> str | None:
    intent = classify_intent_keywords(question)
    if intent:
        return intent
    return classify_intent_llm(question, llm)


# ---------------------------------------------------------------------------
# 2. Metadata-filtered retriever
# ---------------------------------------------------------------------------
def make_filtered_retriever(vectorstore, llm, k: int = 5, fallback_k: int = 4):
    """Returns a Runnable that classifies the question's intent, searches
    the vectorstore filtered to that metadata type, and falls back to an
    unfiltered search if the filtered search comes back empty (e.g. the
    classifier guessed wrong, or the info genuinely lives elsewhere)."""

    def retrieve(inputs):
        # create_retrieval_chain passes the full chain input dict here,
        # e.g. {"input": "quelle est l'adresse de la fsbm ?"}
        question = inputs["input"] if isinstance(inputs, dict) else inputs

        intent = classify_intent(question, llm)

        if intent:
            docs = vectorstore.similarity_search(
                question, k=k, filter={"type": intent}
            )
            if docs:
                return docs

        # No confident intent, or filtered search returned nothing -> fallback
        return vectorstore.similarity_search(question, k=fallback_k)

    return RunnableLambda(retrieve)


# ---------------------------------------------------------------------------
# 3. Chat engine assembly
# ---------------------------------------------------------------------------
def get_chat_engine():
    embeddings = HuggingFaceEmbeddings(
        model_name="intfloat/multilingual-e5-large"
    )

    vectorstore = Chroma(
        persist_directory="../data/vector_db",
        embedding_function=embeddings,
    )

    llm = ChatOllama(model="llama3.2:1b", temperature=0.3)

    retriever = make_filtered_retriever(vectorstore, llm, k=5, fallback_k=4)

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

    document_chain = create_stuff_documents_chain(llm, prompt)
    chain = create_retrieval_chain(retriever, document_chain)

    return chain


if __name__ == "__main__":
    bot = get_chat_engine()

    print("Chatbot FSBM prêt ! Pose ta question :")
    while True:
        query = input("> ")
        if query.lower() in ("quit", "exit"):
            break

        # Quick visibility into what the classifier decided, useful while tuning
        intent_debug = classify_intent_keywords(query)
        print(f"[debug] intent (keyword pass): {intent_debug}")

        print("IA: ", end="", flush=True)
        for chunk in bot.stream({"input": query}):
            if "answer" in chunk:
                print(chunk["answer"], end="", flush=True)
        print("\n")