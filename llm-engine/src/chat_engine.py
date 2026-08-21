from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains.retrieval import create_retrieval_chain

import json
import re
from pathlib import Path


# ---------------------------------------------------------------------------
# 0. Fact grounding - correct exact strings (emails) the LLM may have
#    subtly altered while generating natural-sounding prose
# ---------------------------------------------------------------------------
# Small local models (like llama3.2:1b) are prone to "fixing" or fabricating
# structured strings such as emails, even when the correct value is right
# there in the context - because generating fluent text and reproducing an
# exact token sequence character-for-character are different skills. Rather
# than trusting the model's transcription, we verify every email it
# outputs against the emails that actually appear in the retrieved
# documents, and correct or flag anything that doesn't match.
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+")


def extract_emails(text: str) -> set[str]:
    return set(EMAIL_REGEX.findall(text or ""))


def parse_fields(page_content: str) -> dict[str, str]:
    """loader.py always builds document content as 'Label : Value' lines.
    This parses those back into a dict so we can look up a specific field
    (like the coordonnateur's email) directly, instead of treating the
    whole document as an undifferentiated blob of text."""
    fields = {}
    for line in (page_content or "").splitlines():
        if ":" not in line:
            continue
        label, _, value = line.partition(":")
        label = label.strip().lower()
        value = value.strip()
        if label and value:
            fields.setdefault(label, value)
    return fields


def best_matching_doc(question: str, docs):
    """Finds which retrieved document the question is actually about, by
    matching words from the document's identifying name (filiere, nom,
    acronyme, section...) against the question text. Returns None if no
    document has a clear match, so we don't guess wrong."""
    if not question or not docs:
        return None
    q = question.lower()
    best_doc, best_score = None, 0
    for d in docs:
        meta = getattr(d, "metadata", {}) or {}
        identifier = meta.get("filiere") or meta.get("nom") or meta.get("acronyme") or meta.get("section") or ""
        tokens = [t for t in re.split(r"\W+", identifier.lower()) if len(t) > 2]
        score = sum(1 for t in tokens if t in q)
        if score > best_score:
            best_score = score
            best_doc = d
    return best_doc


def emails_from_doc(doc) -> list[str]:
    """Extracts emails only from fields whose label mentions 'mail', so we
    don't accidentally pick up an unrelated email from elsewhere in a
    long document (e.g. a laboratoire card that lists several people)."""
    if not doc:
        return []
    fields = parse_fields(getattr(doc, "page_content", ""))
    emails = []
    for label, value in fields.items():
        if "mail" in label:
            emails.extend(extract_emails(value))
    return emails


def ground_emails_in_answer(answer: str, context_docs, question: str = "") -> str:
    """Replace any email in the answer that doesn't exactly match an email
    found in the retrieved context. If the exact email isn't found, try to
    identify which specific document the question is about and pull the
    correct email straight from its labeled field - this handles the case
    where the correct data IS in context but the (small) LLM still
    garbled it while generating prose. Only falls back to a generic
    warning when we genuinely can't determine the right value."""
    context_text = "\n".join(getattr(d, "page_content", "") for d in (context_docs or []))
    valid_emails = extract_emails(context_text)

    if not valid_emails:
        return answer  # nothing in context to verify against - leave as-is

    target_doc = best_matching_doc(question, context_docs)
    target_emails = emails_from_doc(target_doc)

    def replace_if_invalid(match: re.Match) -> str:
        found = match.group(0)
        if found in valid_emails:
            return found
        for ve in valid_emails:
            if ve.lower() == found.lower():
                return ve  # exact match modulo case

        # Not a real email anywhere in context - try to confidently correct it
        if len(target_emails) == 1:
            return target_emails[0]
        if len(target_emails) > 1:
            return " / ".join(target_emails)
        if len(valid_emails) == 1:
            return next(iter(valid_emails))
        return "[adresse e-mail non vérifiée - voir la fiche source]"

    return EMAIL_REGEX.sub(replace_if_invalid, answer)


# ---------------------------------------------------------------------------
# 1.5 Exact-identifier override - for short codes that embed poorly
# ---------------------------------------------------------------------------
# Acronyms like "LAMS" or schedule sections carry very little semantic
# signal on their own - the embedding model mostly keys off the
# surrounding French prose, which many cards of the same type share
# (e.g. every laboratoire card starts with similar boilerplate wording).
# That means two different labs' cards can embed close together, and
# similarity search can genuinely return the wrong one - not a "wrong
# string" bug like the email case, a "wrong document" bug. The fix has
# to happen at retrieval time: if the question mentions an exact
# identifier we recognize, fetch that document directly by metadata
# instead of relying on embedding similarity for it.
def build_identifier_index(vectorstore, type_name: str, metadata_key: str) -> dict:
    """Fetches all documents of a given type once (via exact metadata
    filter, no embedding search involved) and builds a lookup from their
    short identifier (lowercased) to the actual Document."""
    try:
        raw = vectorstore.get(where={"type": type_name}, include=["documents", "metadatas"])
    except Exception:
        return {}

    from langchain_core.documents import Document

    index = {}
    for doc_text, meta in zip(raw.get("documents", []) or [], raw.get("metadatas", []) or []):
        identifier = (meta or {}).get(metadata_key)
        if identifier:
            index[str(identifier).strip().lower()] = Document(page_content=doc_text, metadata=meta or {})
    return index


def find_forced_docs(question: str, *identifier_indexes: dict) -> list:
    """Checks the question for any exact identifier (whole word match) from
    the given lookup indexes, and returns the matching documents."""
    q_lower = question.lower()
    forced = []
    for index in identifier_indexes:
        for identifier, doc in index.items():
            if re.search(rf"\b{re.escape(identifier)}\b", q_lower):
                forced.append(doc)
    return forced


# ---------------------------------------------------------------------------
# 1. Intent classification -> metadata["type"]
# ---------------------------------------------------------------------------
# Keyword bank per type, loaded from an external JSON file so it can be
# edited/extended without touching this code. Path is resolved relative to
# this file (not the current working directory) so it works no matter
# where the script is launched from.
TYPE_KEYWORDS_PATH = Path(__file__).parent / "type_keywords.json"


def load_type_keywords(path: Path = TYPE_KEYWORDS_PATH) -> dict[str, list[str]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Drop any "_comment"-style metadata keys, keep only actual type -> keywords
    return {k: v for k, v in data.items() if not k.startswith("_")}


TYPE_KEYWORDS = load_type_keywords()

# These MUST match the values set in metadata={"type": ...} inside loader.py.
# Derived from the JSON keys so the two stay in sync automatically.
VALID_TYPES = list(TYPE_KEYWORDS.keys())

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
    # return classify_intent_llm(question, llm)
    return None


# ---------------------------------------------------------------------------
# 2. Metadata-filtered retriever
# ---------------------------------------------------------------------------

def make_filtered_retriever(vectorstore, llm, k: int = 6, fallback_k: int = 5, identifier_indexes: tuple = ()):
    def retrieve(inputs):
        question = inputs["input"] if isinstance(inputs, dict) else inputs
        forced_docs = find_forced_docs(question, *identifier_indexes)
        intent = classify_intent(question, llm)

        docs = []
        if intent:
            # On prend les meilleurs documents de la catégorie détectée
            docs = vectorstore.similarity_search(question, k=k, filter={"type": intent})

        # NOUVEAUTÉ : On ajoute TOUJOURS des documents généraux (sans filtre) 
        # pour croiser les données (par exemple si la question parle d'une formation ET d'un labo)
        general_docs = vectorstore.similarity_search(question, k=fallback_k)

        # On fusionne tout en supprimant les doublons
        seen = set()
        merged = []
        for d in forced_docs + docs + general_docs:
            key = d.page_content
            if key not in seen:
                seen.add(key)
                merged.append(d)
        return merged

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

    # llm = ChatOllama(model="llama3.2:1b", temperature=0.3)
    llm = ChatOllama(model="qwen2.5:3b", temperature=0.0)

    # Built once at startup (small dataset, cheap) - see build_identifier_index
    # for why acronyms/section codes need this exact-match override.
    lab_acronym_index = build_identifier_index(vectorstore, "laboratoire", "acronyme")
    emploi_section_index = build_identifier_index(vectorstore, "emploi_du_temps", "section")
    # A question naming a specific professor or département shouldn't
    # depend on the keyword classifier guessing the right "type" - their
    # own card (now enriched with department, lab/équipe, coordinated
    # formations, filières, etc.) is force-included whenever their exact
    # name is mentioned, the same way lab acronyms are.
    prof_name_index = build_identifier_index(vectorstore, "professeur", "nom")
    dept_name_index = build_identifier_index(vectorstore, "departement", "nom")

    retriever = make_filtered_retriever(
        vectorstore, llm, k=4, fallback_k=3,
        identifier_indexes=(lab_acronym_index, emploi_section_index, prof_name_index, dept_name_index),
    )

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
6. Ne modifie, ne corrige ni ne reformule JAMAIS les adresses e-mail, numéros de téléphone, liens web ou identifiants exacts présents dans le contexte : recopie-les strictement tels quels, caractère pour caractère, sans aucune altération.

Contexte fourni :
{context}

Question de l'utilisateur :
{input}

Réponse de l'assistant :
"""
    )

    document_chain = create_stuff_documents_chain(llm, prompt)

    base_chain = create_retrieval_chain(retriever, document_chain)

    # NOTE: email grounding is intentionally NOT chained on here via
    # RunnableLambda anymore. A plain RunnableLambda has no streaming
    # ("transform") implementation, so LangChain can't pass partial
    # chunks through it - it has to buffer the ENTIRE answer, run the
    # lambda once, and emit a single chunk at the end. That silently
    # turns real token-by-token streaming into "wait for everything,
    # then get it all at once". Grounding only needs the *finished*
    # answer anyway, so callers should stream this chain directly for
    # real deltas, then call ground_emails_in_answer() themselves once
    # on the accumulated text (see the __main__ block below, or
    # main.py's /api/chat endpoint).
    return base_chain

def get_grounded_answer(chain, question: str) -> dict:
    """Non-streaming helper: invokes the chain and applies email grounding
    to the final answer. Use this wherever full correctness matters more
    than perceived latency (the JSON /api/chat endpoint, benchmarking) -
    for a live-typing UI, stream the chain directly instead and ground
    the accumulated text at the end (see main.py's /api/chat/stream)."""
    response = chain.invoke({"input": question})
    response = dict(response)
    response["answer"] = ground_emails_in_answer(
        response["answer"], response.get("context"), question
    )
    return response


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
<<<<<<< HEAD
        accumulated_answer = ""
        context_docs = None
        for chunk in bot.stream({"input": query}):
            if "context" in chunk and context_docs is None:
                context_docs = chunk["context"]
            if "answer" in chunk:
                accumulated_answer += chunk["answer"]
                print(chunk["answer"], end="", flush=True)
        print()

        # Grounding runs once, after the full answer has streamed - see
        # the note in get_chat_engine() for why this can't happen mid-stream.
        grounded = ground_emails_in_answer(accumulated_answer, context_docs, query)
        if grounded != accumulated_answer:
            print(f"[correction appliquée] {grounded}")
        print()
=======
        full_answer = ""
        context_docs = None
        for chunk in bot.stream({"input": query}):
            if "context" in chunk:
                context_docs = chunk["context"]
            if "answer" in chunk:
                full_answer += chunk["answer"]
                print(chunk["answer"], end="", flush=True)
        print("\n")

        grounded = ground_emails_in_answer(full_answer, context_docs, query)
        if grounded != full_answer:
            print(f"[debug] correction appliquée -> {grounded}\n")
>>>>>>> team-web
