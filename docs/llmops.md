# Documentation : Architecture LLMOps et Backend (Assistant Conversationnel FSBM)

**Version :** 1.0.0
**Composant :** Moteur LLM FastAPI & Pipeline RAG
**Infrastructure Cible :** Environnement Python 3.11 Conteneurisé (Docker)
**Stack Principal :** FastAPI, LangChain, ChromaDB, HuggingFace (`multilingual-e5-large`), Ollama (`qwen2.5:3b`), OpenTelemetry, Prometheus

---

## 1. Vue d'Ensemble du Système

Le backend LLMOps est le cœur intelligent de l'Assistant Conversationnel de la FSBM. Construit sur FastAPI, ce microservice est responsable de la transformation des données structurées générées par le pipeline DataOps en embeddings vectoriels enrichis, de la gestion des requêtes de Génération Augmentée par la Recherche (RAG) en temps réel, et de la diffusion (streaming) des réponses vers le frontend.

Cette architecture implémente des techniques de recherche avancées — telles que la classification déterministe des intentions, les recherches par identifiants exacts, et l'ancrage factuel post-génération (fact grounding) — pour garantir l'absence totale d'hallucinations sur les données critiques de l'université.

---

## 2. Pipeline d'Analyse et de Vectorisation des Documents

Avant que le moteur de chat ne puisse répondre aux questions, les données structurées de DuckDB doivent être aplaties, enrichies et vectorisées.

### 2.1. Aplatissement des Relations Multi-Sauts (`loader.py`)

Le RAG traditionnel a du mal avec le raisonnement multi-sauts (multi-hop) (ex. : trouver un professeur, puis trouver son laboratoire, puis trouver le directeur du laboratoire). Le script `loader.py` élimine ce problème en pré-calculant les relations lors de la phase de génération des documents :

* **Affiliations aux Laboratoires :** Il croise la table `stg_laboratoires` pour injecter les acronymes des laboratoires et les noms des directeurs directement dans les documents individuels `Professeur` et `Formation`.
* **Agrégation des E-mails :** Il analyse les tableaux JSON d'e-mails et les attache aux entités correspondantes (ex. : ajout de l'e-mail direct du coordonnateur d'une formation dans le document de cette formation).
* **Décodage des Emplois du Temps :** Les plannings hebdomadaires JSON complexes sont traduits en phrases naturelles en français (ex. : "Le Lundi de 08h30 à 10h00 : [COURS]...") pour maximiser la qualité des embeddings.

### 2.2. Embedding et Indexation ChromaDB (`vectorstore.py`)

Le processus de vectorisation s'exécute automatiquement au démarrage du conteneur.

* **Dépendance à la Base de Données :** Il interroge activement l'existence du fichier `fsbm.duckdb` et attend que le pipeline DataOps (dbt) termine de construire les vues `clean_data` avant de continuer.
* **Modèle d'Embedding :** Utilise `intfloat/multilingual-e5-large` via HuggingFace.
* **Accélération Matérielle :** Détecte et utilise automatiquement `cuda` (NVIDIA) ou `mps` (Apple Silicon) si disponible, sinon se rabat sur le `cpu`.
* **Traitement par Lots (Batch) :** Les documents sont traités par lots (taille par défaut : 32) et persistés localement dans `chroma.sqlite3` pour éviter une réindexation lors des redémarrages ultérieurs.

---

## 3. Moteur de Génération Augmentée par la Recherche (RAG)

Le fichier `chat_engine.py` orchestre la logique de recherche et de génération à l'aide de LangChain.

### 3.1. Classification des Intentions et Filtrage des Métadonnées

Pour éviter la contamination croisée des contextes (ex. : confondre le nom d'un professeur avec celui d'un laboratoire), le système classifie chaque requête utilisateur avant d'interroger la base de données vectorielle.

* **Mise en Correspondance Déterministe des Mots-Clés :** Utilise un dictionnaire JSON externe prédéfini (`type_keywords.json`) pour classer les requêtes dans des catégories exactes : `professeur`, `formation`, `laboratoire`, `emploi_du_temps`, `departement`, ou `etablissement`.
* **Recherche Filtrée :** L'intention détectée est transmise comme filtre de métadonnées (`{"type": intent}`) à ChromaDB, garantissant que les $k=4$ meilleurs documents proviennent strictement du bon domaine, tandis qu'une requête de secours récupère $k=3$ documents généraux.

### 3.2. Remplacement par Identifiant Exact (Override)

La recherche sémantique standard a des difficultés avec les acronymes courts ou les codes de section. Le système construit des index de recherche en mémoire au démarrage pour les entités critiques :

* Acronymes de Laboratoires (ex. : "LAMS")
* Sections d'Emplois du Temps (ex. : "PC S1")
* Noms de Professeurs et de Départements

Si la requête d'un utilisateur contient l'un de ces identifiants exacts, le document correspondant est injecté de force dans le contexte du LLM, contournant entièrement la recherche de similarité par embedding.

### 3.3. Ancrage Factuel Post-Génération (Anti-Hallucination)

Les petits LLM locaux (comme `qwen2.5:3b`) modifient parfois subtilement les chaînes structurées comme les e-mails lors de la génération de texte naturel.

* La fonction `ground_emails_in_answer()` agit comme un filet de sécurité. Elle intercepte la réponse finale du LLM, extrait tous les e-mails générés via Regex (`[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+`), et les vérifie par rapport aux e-mails exacts présents dans les documents de contexte récupérés.
* Si le LLM a inventé ou mal orthographié un e-mail, le système l'écrase de manière programmatique avec la chaîne correcte issue du document source avant de le renvoyer à l'utilisateur.

---

## 4. Service de Génération de Titres

Le module `generate_title.py` exécute un pipeline LLM secondaire et indépendant dédié à la génération de titres de conversation pour la barre latérale de l'interface utilisateur (UI).

* **Détection de Langue sans LLM :** Utilise la bibliothèque `lingua` pour détecter instantanément si le prompt de l'utilisateur est en français, anglais ou arabe, sans consommer de temps d'inférence LLM.
* **Prévention des Doublons :** Accepte une liste de titres d'exception (`exception_titles`, qui sont les titres existant déjà dans l'historique de l'utilisateur). Si le LLM génère un doublon, le système réessaie automatiquement jusqu'à 5 fois en utilisant un modèle de secours avec une température plus élevée (`temperature=0.4`) couplé à un prompt négatif strict.

---

## 5. API, Observabilité et Conteneurisation

Le système est exposé via une application FastAPI prête pour la production (`main.py`), conçue pour le streaming et l'observabilité approfondie.

### 5.1. Endpoints de Streaming

* **Server-Sent Events (SSE) :** Le point de terminaison `/api/chat/stream` renvoie les tokens en direct au fur et à mesure qu'ils sont générés par Ollama. Il utilise un formateur `_sse_event` personnalisé pour garantir le strict respect du protocole `data: {"type": "delta", "text": "..."}\n\n` attendu par le frontend Next.js.
* **Prévention de la Mise en Cache (Buffering) :** Les en-têtes HTTP (`Cache-Control: no-cache`, `X-Accel-Buffering: no`) sont explicitement configurés pour empêcher les serveurs proxy (comme Nginx) de mettre en cache les tokens diffusés.

### 5.2. Télémétrie et Observabilité MLOps

Le backend est entièrement instrumenté pour la surveillance des performances :

* **OpenTelemetry :** Injecte des `Trace IDs` dans les journaux stdout standard de Python et exporte les données de span (ex. : séparer le temps passé sur `rag_and_llm_generation` vs `ground_emails_postprocess`) via gRPC vers un collecteur (Tempo).
* **Métriques Prometheus :** Expose un endpoint `/metrics` suivant les requêtes HTTP FastAPI et les métriques MLOps personnalisées, notamment :
* `llm_tokens_generated_total` (Counter) : Nombre total de tokens de sortie générés.
* `rag_retrieval_duration_seconds` (Histogram) : Latence de la recherche ChromaDB.
* `rag_retrieved_documents_count` (Summary) : Le nombre de documents de contexte transmis au LLM par requête.

### 5.3. Cycle de Vie d'Exécution Docker

Le fichier `Dockerfile` impose une séquence de démarrage stricte :

1. `pip install` avec des délais d'attente agressifs et des wheels PyTorch optimisés pour CPU.
2. Exécution de `python -m src.vectorstore` pour construire l'index ChromaDB de manière synchrone.
3. Exécution de `uvicorn main:app` pour démarrer le serveur web sur le port 8000 uniquement après que la base de données vectorielle soit entièrement initialisée et prête à servir les requêtes.