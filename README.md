# 🎓 FSBM Assistant — End-to-End AI, DataOps & MLOps Platform

> **A production-oriented university AI assistant built as a complete Data Engineering, RAG, MLOps, DevOps and Observability system.**

The goal of this project is not simply to create a chatbot.

The project demonstrates how to build an AI application as a **complete software platform**, where data ingestion, transformation, retrieval, LLM inference, application APIs, user persistence, monitoring, testing, containerization and automated deployment are treated as separate but connected engineering layers.

The platform is designed around the Faculty of Sciences Ben M'Sik (**FSBM**) and can answer questions about:

* academic programs and formations
* professors and researchers
* laboratories and research teams
* departments
* timetables
* faculty information and contacts

The system combines:

```text
Data Engineering
      +
DataOps
      +
RAG
      +
Local LLM Inference
      +
Backend Engineering
      +
Frontend Engineering
      +
Observability
      +
CI/CD
      +
Automated Deployment
```

---

# 📚 Table of Contents

* [1. What Is This Project?](#1-what-is-this-project)
* [2. The Main Engineering Problem](#2-the-main-engineering-problem)
* [3. High-Level Architecture](#3-high-level-architecture)
* [4. Complete Data Lifecycle](#4-complete-data-lifecycle)
* [5. DataOps Pipeline](#5-dataops-pipeline)
* [6. Step 1 — Raw FSBM Data](#6-step-1--raw-fsbm-data)
* [7. Step 2 — Data Ingestion With dlt](#7-step-2--data-ingestion-with-dlt)
* [8. Step 3 — DuckDB Raw Layer](#8-step-3--duckdb-raw-layer)
* [9. Step 4 — dbt Transformation](#9-step-4--dbt-transformation)
* [10. Step 5 — Dagster Orchestration](#10-step-5--dagster-orchestration)
* [11. RAG Pipeline](#11-rag-pipeline)
* [12. Step 6 — Loading Structured Data Into Documents](#12-step-6--loading-structured-data-into-documents)
* [13. Step 7 — Embedding Generation](#13-step-7--embedding-generation)
* [14. Step 8 — Chroma Vector Store](#14-step-8--chroma-vector-store)
* [15. Step 9 — Query Intent Detection](#15-step-9--query-intent-detection)
* [16. Step 10 — Retrieval Strategy](#16-step-10--retrieval-strategy)
* [17. Step 11 — LLM Generation](#17-step-11--llm-generation)
* [18. Step 12 — Exact-Data Grounding](#18-step-12--exact-data-grounding)
* [19. Complete Question-to-Answer Execution](#19-complete-question-to-answer-execution)
* [20. FastAPI Backend](#20-fastapi-backend)
* [21. Streaming Architecture](#21-streaming-architecture)
* [22. Conversation Title Generation](#22-conversation-title-generation)
* [23. Frontend Architecture](#23-frontend-architecture)
* [24. Authentication](#24-authentication)
* [25. Conversation Persistence](#25-conversation-persistence)
* [26. Database Design](#26-database-design)
* [27. Voice and User Experience](#27-voice-and-user-experience)
* [28. Observability Architecture](#28-observability-architecture)
* [29. Metrics](#29-metrics)
* [30. Logging](#30-logging)
* [31. Distributed Tracing](#31-distributed-tracing)
* [32. Alerting](#32-alerting)
* [33. Docker Architecture](#33-docker-architecture)
* [34. Persistent Storage](#34-persistent-storage)
* [35. CI/CD Pipeline](#35-cicd-pipeline)
* [36. Automated Deployment](#36-automated-deployment)
* [37. Repository Structure](#37-repository-structure)
* [38. API Reference](#38-api-reference)
* [39. Local Installation](#39-local-installation)
* [40. Rebuilding the Knowledge Base](#40-rebuilding-the-knowledge-base)
* [41. Testing](#41-testing)
* [42. Important Engineering Decisions](#42-important-engineering-decisions)
* [43. Current Limitations](#43-current-limitations)
* [44. Production Hardening](#44-production-hardening)
* [45. Future Improvements](#45-future-improvements)
* [46. Author](#46-author)

---

# 1. What Is This Project?

**FSBM Assistant** is a university conversational AI system using a **Retrieval-Augmented Generation (RAG)** architecture.

Instead of asking an LLM to answer everything from its pretrained knowledge, the system first retrieves relevant information from a structured institutional knowledge base.

The simplified concept is:

```text
User Question
      │
      ▼
Retrieve FSBM Knowledge
      │
      ▼
Relevant Context
      │
      ▼
Local LLM
      │
      ▼
Generated Answer
```

However, the real implementation is considerably more sophisticated.

The complete system is:

```text
                         ┌───────────────────────────┐
                         │        FSBM DATA          │
                         │ JSON knowledge sources    │
                         └────────────┬──────────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │     dlt      │
                              │  ingestion   │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │    DuckDB    │
                              │   raw_data   │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │     dbt      │
                              │ transformation│
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │   clean_data │
                              │ staging views│
                              └──────┬───────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                          ▼                     ▼
                    Data Documents       Analytical Data
                          │
                          ▼
                     Embeddings
                          │
                          ▼
                     Chroma DB
                          │
                          ▼
User ──► Next.js ──► FastAPI ──► RAG Retriever
                                  │
                                  ▼
                                Ollama
                                  │
                                  ▼
                            Qwen 2.5 3B
                                  │
                                  ▼
                         Grounding / Validation
                                  │
                                  ▼
                              Response
```

---

# 2. The Main Engineering Problem

A naive university chatbot could simply do:

```text
Question
   ↓
LLM
   ↓
Answer
```

This creates several problems.

The model may:

* not know FSBM-specific information
* confuse similar professors
* retrieve the wrong research laboratory
* invent or alter email addresses
* hallucinate information not present in the knowledge base
* produce answers without operational visibility
* make it difficult to update institutional information

This project therefore separates the problem into multiple layers.

```text
                    UNIVERSITY AI SYSTEM

                        ┌─────────────┐
                        │    DATA     │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │  DATAOPS    │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │   RETRIEVAL │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │     LLM     │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │ VALIDATION  │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │ APPLICATION  │
                        └──────┬──────┘
                               │
                  ┌────────────▼────────────┐
                  │     OBSERVABILITY       │
                  └─────────────────────────┘
```

The important idea is:

> **The LLM is one component of the system, not the system itself.**

---

# 3. High-Level Architecture

The project can be divided into six major domains.

## 3.1 Data Engineering

Responsible for turning raw JSON data into structured relational data.

Technologies:

```text
dlt
DuckDB
dbt
Dagster
```

## 3.2 AI / RAG

Responsible for transforming structured data into searchable knowledge and generating answers.

Technologies:

```text
LangChain
Hugging Face Embeddings
Chroma
Ollama
Qwen 2.5 3B
```

## 3.3 Backend

Responsible for exposing the AI functionality through APIs.

Technology:

```text
FastAPI
```

## 3.4 Frontend

Responsible for the user experience.

Technologies:

```text
Next.js
React
TypeScript
Tailwind CSS
Prisma
NextAuth
```

## 3.5 Persistence

Responsible for storing users and conversations.

Technology:

```text
MariaDB
Prisma
```

## 3.6 Observability

Responsible for understanding what the system is doing.

Technologies:

```text
Prometheus
Grafana
Loki
Promtail
Tempo
OpenTelemetry
Alertmanager
cAdvisor
```

---

# 4. Complete Data Lifecycle

The entire data lifecycle is:

```text
                         RAW DATA
                            │
                            ▼
                       dlt ingestion
                            │
                            ▼
                      DuckDB raw_data
                            │
                            ▼
                         dbt build
                            │
                            ▼
                     DuckDB clean_data
                            │
                            ▼
                     Python loader
                            │
                            ▼
                   LangChain Documents
                            │
                            ▼
                 multilingual embeddings
                            │
                            ▼
                        Chroma
                            │
                            ▼
                       Retrieval
                            │
                            ▼
                      LLM context
                            │
                            ▼
                         Qwen
                            │
                            ▼
                    Grounding / correction
                            │
                            ▼
                         Answer
```

This creates a clean boundary between:

```text
Data Preparation
```

and

```text
AI Inference
```

---

# 5. DataOps Pipeline

The DataOps layer lives mainly inside:

```text
dataops/
```

Its job is to guarantee that the AI system does not directly consume chaotic raw data.

The architecture is:

```text
Raw JSON
   │
   ▼
dlt
   │
   ▼
DuckDB / raw_data
   │
   ▼
dbt
   │
   ▼
DuckDB / clean_data
   │
   ▼
Dagster
   │
   ▼
Materialized Data Pipeline
```

The main orchestration file is:

```text
dataops/orchestration.py
```

The ingestion implementation is:

```text
dataops/ingest_dlt.py
```

The transformation project is:

```text
dataops/fsbm_transform/
```

---

# 6. Step 1 — Raw FSBM Data

The project starts from JSON source files stored under:

```text
dataops/data/raw_json/
```

The ingestion layer expects sources such as:

```text
fsbm.json
departements.json
formations.json
emplois.json
laboratoires.json
professeurs.json
```

These represent different parts of the university knowledge domain.

For example:

```text
fsbm.json
```

contains general faculty information.

```text
formations.json
```

contains hierarchical information about academic programs.

```text
professeurs.json
```

contains professor information.

```text
laboratoires.json
```

contains laboratories, teams and members.

```text
emplois.json
```

contains timetable information.

The important architectural decision is that these files are treated as **input data**, not as documents directly given to the LLM.

---

# 7. Step 2 — Data Ingestion With dlt

The ingestion pipeline is implemented in:

```text
dataops/ingest_dlt.py
```

The project creates a dlt pipeline:

```python
pipeline = dlt.pipeline(
    pipeline_name="fsbm_ingestion",
    destination=dlt.destinations.duckdb(
        credentials=DUCKDB_PATH
    ),
    dataset_name="raw_data"
)
```

The destination is DuckDB.

The dataset is:

```text
raw_data
```

This means the first objective of ingestion is:

```text
JSON
 ↓
DuckDB raw_data
```

---

## 7.1 Resources

Each logical data source is represented as a dlt resource.

For example:

```text
get_fsbm_data()
get_departements_data()
get_formations_data()
get_emplois_data()
get_laboratoires_data()
get_professeurs_data()
```

The resources use:

```text
write_disposition="replace"
```

Therefore, ingestion currently behaves like:

```text
Run pipeline
      ↓
Replace raw dataset
      ↓
Load current source data
```

rather than an incremental append strategy.

---

# 8. Step 3 — DuckDB Raw Layer

The raw database path is:

```text
/app/data/duckdb/fsbm.duckdb
```

inside Docker.

The DataOps container shares this directory with the backend through the Docker volume:

```text
shared_pipeline_data
```

The conceptual architecture is:

```text
Dagster Container
       │
       │ writes
       ▼
/app/data/duckdb/fsbm.duckdb
       │
       │ shared volume
       ▼
Backend Container
```

This is one of the most important interfaces between Data Engineering and AI Engineering.

---

# 9. Step 4 — dbt Transformation

After ingestion, the raw schema is transformed using **dbt**.

The project is:

```text
dataops/fsbm_transform/
```

The dbt profile uses DuckDB:

```yaml
type: duckdb
path: /app/data/duckdb/fsbm.duckdb
database: fsbm
schema: clean_data
```

The result is:

```text
raw_data
    ↓
clean_data
```

The dbt project configures staging models as views.

---

# 10. dbt Source Layer

The dbt source definition is:

```text
models/sources.yml
```

It declares the raw `raw_data` schema and its tables.

The nested FSBM structures are normalized by dlt into multiple relational tables.

For example:

```text
formations
formations__departements
formations__departements__formations
formations__departements__formations__contenu
formations__departements__formations__contenu__modules
formations__departements__formations__axes_de_recherche
```

Likewise laboratories contain:

```text
laboratoires
laboratoires__equipes
laboratoires__equipes__membres
```

and professor email data is represented separately:

```text
professeurs
professeurs__email
```

The repository currently declares these raw relations explicitly in both the dlt/dbt integration and the dbt source configuration.

---

# 11. dbt Staging Models

The important staging models include:

```text
stg_formations.sql
stg_professeurs.sql
stg_laboratoires.sql
stg_departements.sql
stg_emplois.sql
stg_faculte.sql
```

These models are not simply renaming columns.

They perform data reconstruction.

---

## 11.1 Formations

The formation hierarchy is reconstructed through several relational joins.

Conceptually:

```text
formations
       │
       ▼
departements
       │
       ▼
filieres
       │
       ├── modules
       │
       └── axes de recherche
```

dbt then produces a clean formation view containing fields such as:

```text
cycle
nom_departement
nom_filiere
coordonnateur
specialite
objectifs
debouches
cible
domaine
description
modules_json
axes_recherche_json
```

This is important because the source structure is hierarchical, while the RAG layer eventually needs a coherent semantic document.

---

## 11.2 Professors

Professor data is enriched with aggregated emails.

The transformation combines:

```text
professeurs
       +
professeurs__email
```

into a structured staging model containing:

```text
nom_professeur
statut
linkedin_url
emails_json
scopus_profile_url
biographie
nom_departement
```

---

## 11.3 Laboratories

Laboratory data is rebuilt into a structure containing:

```text
laboratoire
acronyme
description
directeur
directeur_adjoint
equipes_json
```

The members are grouped by research team.

Therefore:

```text
Laboratory
    │
    ├── Team A
    │     ├── Researcher 1
    │     └── Researcher 2
    │
    └── Team B
          ├── Researcher 3
          └── Researcher 4
```

can be represented in a single staging record.

---

## 11.4 Timetables

Timetable data starts as many columns representing:

```text
day × time slot
```

The dbt model rebuilds this into a structured JSON planning object.

The supported weekly structure includes:

```text
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
```

with five time ranges per day.

---

# 12. Step 5 — Dagster Orchestration

Dagster is responsible for turning the individual DataOps steps into an executable dependency graph.

The main file is:

```text
dataops/orchestration.py
```

The project creates two logical groups of assets:

```text
raw_fsbm_data
clean_fsbm_data
```

---

## 12.1 Raw Asset

`raw_fsbm_data` calls the six ingestion resources:

```text
FSBM
Departments
Formations
Schedules
Laboratories
Professors
```

The pipeline therefore starts with:

```text
raw_fsbm_data
```

---

## 12.2 dbt Asset

The second asset is:

```text
clean_fsbm_data
```

and executes:

```text
dbt build
```

through:

```text
DbtCliResource
```

Therefore Dagster becomes the orchestration layer connecting:

```text
dlt
  ↓
DuckDB
  ↓
dbt
```

The relationship can be represented as:

```text
             DAGSTER
                │
                ▼
       ┌─────────────────┐
       │ raw_fsbm_data   │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ clean_fsbm_data │
       └─────────────────┘
```

---

# 13. Why Use Both dlt, dbt and Dagster?

Each tool has a different responsibility.

## dlt

Handles:

```text
Extraction + Loading
```

## dbt

Handles:

```text
Transformation + SQL modeling
```

## Dagster

Handles:

```text
Orchestration + dependency management + execution
```

So:

```text
dlt  = move the data
dbt  = transform the data
Dagster = control the pipeline
```

This separation is a key Data Engineering design principle.

---

# 14. RAG Pipeline

The AI side begins after `clean_data` has been generated.

The complete RAG architecture is:

```text
clean_data
    │
    ▼
Python Loader
    │
    ▼
LangChain Documents
    │
    ▼
Embeddings
    │
    ▼
Chroma
    │
    ▼
Retriever
    │
    ▼
Relevant Context
    │
    ▼
Prompt
    │
    ▼
Ollama / Qwen
    │
    ▼
Answer
```

---

# 15. Step 6 — Loading Structured Data Into Documents

The loader is:

```text
llm-engine/src/loader.py
```

It connects directly to the clean DuckDB staging layer.

It reads:

```text
clean_data.stg_formations
clean_data.stg_professeurs
clean_data.stg_laboratoires
clean_data.stg_departements
clean_data.stg_emplois
clean_data.stg_faculte
```

and converts rows into LangChain `Document` objects.

This creates a bridge:

```text
Relational Data
      ↓
Semantic Documents
```

---

# 16. Why the Loader Does More Than `SELECT *`

The loader performs semantic enrichment before indexing.

This is one of the most important pieces of the architecture.

A pure row-to-document transformation would create isolated records.

But the chatbot frequently needs cross-domain answers.

For example:

```text
Who coordinates Master X?
Which laboratory does that professor belong to?
Who directs that laboratory?
```

A naive retriever might need three unrelated documents.

The loader instead enriches documents before vectorization.

---

# 17. Professor ↔ Laboratory Enrichment

The loader creates a normalized name index.

Names are normalized by:

* converting to lowercase
* removing academic titles
* removing punctuation
* splitting into tokens
* sorting tokens

This allows names such as:

```text
BENTAIB MOHSSINE
```

and:

```text
Pr. Mohssine Bentaib
```

to map to the same normalized representation.

This is important because the original data sources do not necessarily format names identically.

---

# 18. Professor Document Enrichment

Professor documents may contain:

```text
Professor name
Department
Academic status
Professional email
LinkedIn
Scopus
Biography
Laboratory
Research team
Coordinated formations
```

This means a professor document can answer several related questions without requiring multiple retrieval steps.

---

# 19. Formation Document Enrichment

Formation documents may contain:

```text
Formation name
Department
Study cycle
Speciality
Coordinator
Coordinator email
Coordinator laboratory
Coordinator research team
Laboratory director
Research domain
Description
Objectives
Career opportunities
Admission information
Modules
Research axes
```

The result is a much more semantically complete retrieval unit.

---

# 20. Department Document Enrichment

Department documents contain:

```text
Department
Department head
Description
Missions
Available formations
Formation coordinators
```

Therefore a question such as:

```text
What formations belong to department X?
```

does not necessarily require a separate search over every formation document.

---

# 21. Timetable Documents

Timetable rows are converted into human-readable documents.

Instead of exposing raw JSON such as:

```json
{
  "Lundi": {
    "08h30_10h00": [...]
  }
}
```

the loader creates text such as:

```text
--- FICHE EMPLOI DU TEMPS ---

Section / Classe concernée: ...

Planning complet:

- Le Lundi de 08h30 à 10h00:
  [Cours] Module X pour le groupe A
  (Salle: ...)
```

This greatly improves the quality of the text given to the LLM.

---

# 22. Step 7 — Embedding Generation

The project uses:

```text
intfloat/multilingual-e5-large
```

as its embedding model.

This is loaded through:

```text
HuggingFaceEmbeddings
```

The loader dynamically chooses:

```text
CUDA
   ↓
MPS
   ↓
CPU
```

depending on what is available.

The embeddings are normalized:

```python
normalize_embeddings=True
```

which is appropriate for similarity-based retrieval.

---

# 23. Vector Store Construction

The vector-store implementation is:

```text
llm-engine/src/vectorstore.py
```

It follows this lifecycle:

```text
Check existing Chroma database
        │
        ├── Exists ─────► Skip rebuild
        │
        └── Doesn't exist
                 │
                 ▼
          Wait for DuckDB
                 │
                 ▼
          Load documents
                 │
                 ▼
          Generate embeddings
                 │
                 ▼
          Insert into Chroma
```

---

# 24. Why Does the Backend Wait for DataOps?

The backend is started using:

```text
python -m src.vectorstore
```

before Uvicorn is launched.

The vector-store creation code checks whether:

```text
/app/data/duckdb/fsbm.duckdb
```

exists and whether the expected clean table is available.

It specifically validates:

```text
clean_data.stg_laboratoires
```

before continuing.

This creates an implicit dependency:

```text
DataOps must produce a valid clean DuckDB
                 ↓
        before vectorization
                 ↓
        before chatbot startup
```

This is a very important cross-service dependency.

---

# 25. Chroma Persistence

The vector store is stored under:

```text
/app/vectorstore
```

and backed by the Docker volume:

```text
vectorstore_cache
```

The project checks for:

```text
chroma.sqlite3
```

to determine whether the vector store has already been built.

Therefore:

```text
Existing vectorstore
        ↓
No re-embedding
        ↓
Fast backend startup
```

but also:

```text
Updated source data
        ↓
Existing vectorstore
        ↓
Updated data is NOT automatically re-embedded
```

This distinction is important when maintaining the system.

---

# 26. Step 8 — Query Intent Detection

The chatbot does not rely only on raw similarity search.

The question first goes through intent classification.

Supported semantic types include:

```text
professeur
formation
laboratoire
emploi_du_temps
departement
etablissement
autre
```

The keyword configuration is stored separately in:

```text
src/type_keywords.json
```

The code loads these definitions dynamically.

---

# 27. Current Intent Classifier

The current implementation uses a deterministic keyword strategy.

Conceptually:

```text
Question
   │
   ▼
lowercase
   │
   ▼
search configured keywords
   │
   ▼
calculate score per type
   │
   ▼
select highest scoring type
```

For example:

```text
"email du professeur X"
```

may produce:

```text
professeur
```

while:

```text
"modules du master Y"
```

may produce:

```text
formation
```

The implementation contains an LLM classification fallback function, but the fallback call is currently commented out.

Therefore the **active classifier is keyword-based**, not LLM-based.

This is an intentional performance-oriented design choice in the current implementation.

---

# 28. Step 9 — Exact Identifier Retrieval

Semantic embeddings are powerful, but short identifiers can be problematic.

Examples:

```text
LAMS
```

or:

```text
specific timetable section
```

may not contain enough semantic information for embeddings to distinguish similar documents.

The project therefore creates exact lookup indexes for:

```text
laboratoire.acronyme
emploi_du_temps.section
professeur.nom
departement.nom
```

---

# 29. Forced Document Retrieval

The system scans the question for exact identifiers.

For example:

```text
Question:
"Qui travaille dans le laboratoire LAMS ?"
```

If:

```text
LAMS
```

exists in the laboratory acronym index, the corresponding document is directly inserted into the retrieval result.

This means the pipeline becomes:

```text
Question
   │
   ├── semantic retrieval
   │
   └── exact identifier lookup
              │
              ▼
          forced document
```

The two results are then combined.

---

# 30. Step 10 — Retrieval Strategy

The active retriever uses three sources.

## A. Forced Documents

Exact identifier matches.

## B. Intent-Filtered Search

When an intent is detected:

```text
similarity_search(
    question,
    k=4,
    filter={"type": intent}
)
```

## C. General Search

An additional unfiltered similarity search:

```text
k=3
```

The final result is:

```text
forced docs
+
intent-specific docs
+
general docs
```

Then duplicates are removed.

---

# 31. Why Use Both Filtered and General Search?

A purely filtered retriever can fail when the question spans multiple domains.

Example:

```text
Which laboratory does the coordinator of Master X belong to?
```

The question is primarily about a formation.

But the answer may require laboratory information.

The architecture therefore keeps a general retrieval fallback alongside intent-specific retrieval.

Conceptually:

```text
                 Question
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    Intent Search        General Search
          │                   │
          └─────────┬─────────┘
                    │
                    ▼
                 Merge
                    │
                    ▼
              Final Context
```

---

# 32. Retrieval Metrics

The retrieval system records:

```text
rag_retrieval_duration_seconds
```

to measure retrieval latency.

It also records:

```text
rag_retrieved_documents_count
```

to measure how many documents were returned.

Both metrics are labeled by:

```text
intent
```

This makes it possible to ask:

```text
Which intent is slowest?
```

or:

```text
Which intent retrieves the most documents?
```

---

# 33. Step 11 — LLM Generation

The project uses:

```text
Ollama
```

for local inference.

The backend connects to:

```text
http://ollama:11434
```

and uses:

```text
qwen2.5:3b
```

with:

```text
temperature = 0
```

The inference architecture is:

```text
FastAPI
   │
   ▼
LangChain
   │
   ▼
ChatOllama
   │
   ▼
Ollama
   │
   ▼
Qwen 2.5 3B
```

The model is therefore not called directly by the browser.

---

# 34. RAG Prompt

The system gives the LLM a carefully defined role:

```text
You are an expert virtual assistant for FSBM.
```

The prompt tells the model to:

* answer naturally
* avoid raw JSON
* summarize technical structures
* state when information is unavailable
* remain concise but complete
* preserve exact emails, phone numbers, links and identifiers

The central input is:

```text
Context
+
User Question
```

which is then transformed into:

```text
Assistant Response
```

---

# 35. Step 12 — Exact-Data Grounding

This is one of the most interesting reliability mechanisms in the repository.

Small local models can modify structured strings while generating natural language.

For example, the source may contain:

```text
someone@fsbm.ma
```

but the LLM could accidentally produce something slightly different.

The system therefore performs a **post-generation verification step** for emails.

---

# 36. Email Grounding Algorithm

After the LLM finishes generating an answer:

```text
Generated Answer
       │
       ▼
Extract emails using regex
       │
       ▼
Compare with emails in retrieved context
       │
       ├── Valid ─────► Keep
       │
       └── Invalid
              │
              ▼
       Determine target document
              │
              ▼
       Find authoritative email
              │
              ▼
       Replace invalid value
```

The system can:

1. keep exact valid emails
2. correct case differences
3. replace an invalid email with the single email from the target document
4. join multiple authoritative emails when necessary
5. emit a warning when it cannot determine the correct address

This is not generic text post-processing.

It is a targeted reliability mechanism for structured information.

---

# 37. Why Grounding Happens After Streaming

An important implementation detail is that email grounding is **not inserted as a normal LangChain streaming middleware step**.

Why?

A normal `RunnableLambda` would force the pipeline to buffer the complete answer before applying the transformation.

That would destroy token-level streaming.

Instead:

```text
LLM token stream
      │
      ▼
Browser receives deltas
      │
      ▼
Full answer accumulated
      │
      ▼
Email grounding
      │
      ▼
Final "done" event
```

This preserves the user experience of live generation while still allowing final correctness checks.

---

# 38. Complete Question-to-Answer Execution

Suppose a user asks:

```text
"Quel est l'email du coordinateur du Master X ?"
```

The complete execution is approximately:

```text
1. Browser sends question
          │
          ▼
2. Next.js API route
          │
          ▼
3. FastAPI /api/chat
          │
          ▼
4. chat_engine.stream()
          │
          ▼
5. Detect intent
          │
          ├── formation
          │
          ▼
6. Retrieve exact identifier documents if applicable
          │
          ▼
7. Similarity search
          │
          ▼
8. Merge and deduplicate documents
          │
          ▼
9. Build LLM prompt
          │
          ▼
10. Send context + question to Qwen
          │
          ▼
11. Stream generated chunks
          │
          ▼
12. Accumulate complete answer
          │
          ▼
13. Validate / correct email
          │
          ▼
14. Send final done event
          │
          ▼
15. Next.js forwards stream
          │
          ▼
16. Browser renders response
```

This is the real end-to-end AI execution path.

---

# 39. FastAPI Backend

The backend is located in:

```text
llm-engine/
```

Main entry point:

```text
llm-engine/main.py
```

The Docker image is based on:

```text
python:3.11-slim
```

and launches:

```bash
python -m src.vectorstore
uvicorn main:app --host 0.0.0.0 --port 8000
```

That means the backend startup itself has two logical phases:

```text
Phase 1:
Build / verify knowledge base

Phase 2:
Start API
```

---

# 40. Backend Startup Sequence

At startup:

```text
Container starts
     │
     ▼
src.vectorstore
     │
     ├── Check Chroma
     ├── Wait for DataOps if required
     ├── Load DuckDB
     ├── Build embeddings if necessary
     └── Build Chroma
     │
     ▼
Uvicorn
     │
     ▼
FastAPI
     │
     ├── Prometheus metrics
     ├── OpenTelemetry
     ├── Logging
     └── Chat engine
```

This is why the first backend startup can be much slower than subsequent startups.

---

# 41. FastAPI Instrumentation

The backend integrates:

```text
Prometheus
OpenTelemetry
```

FastAPI instrumentation automatically records HTTP traces.

Prometheus instrumentation exposes:

```text
/metrics
```

The backend also defines a custom LLM metric:

```text
llm_tokens_generated_total
```

with:

```text
model
```

as a label.

---

# 42. API Streaming

The backend supports Server-Sent Events (**SSE**).

The SSE payload format is:

```json
{
  "type": "delta",
  "text": "..."
}
```

followed by:

```json
{
  "type": "done",
  "text": "final answer"
}
```

An error is returned as:

```json
{
  "type": "error",
  "text": "..."
}
```

The blank line separating SSE events is important because the frontend uses it to split the stream.

---

# 43. Frontend Streaming Architecture

The browser does not directly connect to Ollama.

Instead:

```text
Browser
   │
   ▼
Next.js
/api/chat
   │
   ▼
FastAPI
/api/chat
   │
   ▼
RAG + LLM
   │
   ▼
SSE stream
   │
   ▼
Next.js
   │
   ▼
Browser
```

The Next.js route acts as a streaming proxy.

It forwards:

```text
Content-Type: text/event-stream
```

instead of converting everything into one JSON response.

This is what enables live answer rendering.

---

# 44. API Endpoints

## Chat

```http
POST /api/chat
```

Request:

```json
{
  "question": "..."
}
```

Response:

```text
text/event-stream
```

---

## Alternative Streaming Route

```http
POST /api/chat/stream
```

This also streams the generated answer through SSE.

---

## Title Generation

```http
POST /generate-title
```

Request:

```json
{
  "prompt": "...",
  "language": "...",
  "exception_titles": []
}
```

Response:

```json
{
  "title": "...",
  "language": "...",
  "detected_language": "..."
}
```

---

## Health Check

```http
GET /api/health
```

Example:

```json
{
  "status": "L'API FSBM est opérationnelle"
}
```

---

## Metrics

```http
GET /metrics
```

used by Prometheus.

---

# 45. Conversation Title Generation

The title generator lives in:

```text
llm-engine/src/generate_title.py
```

It uses:

```text
Qwen 2.5 3B
```

through Ollama.

It also uses:

```text
Lingua
```

for language detection.

Supported target languages include:

```text
Arabic
French
English
```

---

# 46. Title Generation Flow

The title generation pipeline is:

```text
Conversation prompt
      │
      ▼
Language explicitly provided?
      │
      ├── Yes ──────► Reuse language
      │
      └── No
            │
            ▼
       Detect language
            │
            ▼
       Select target language
            │
            ▼
        Generate title
            │
            ▼
      Check duplicates
            │
            ├── Duplicate ──► Retry
            │
            └── New ────────► Return
```

The implementation allows up to five attempts.

Already-used titles are supplied as forbidden values.

---

# 47. Frontend Architecture

The frontend lives in:

```text
website/
```

It is built with:

```text
Next.js 16
React 19
TypeScript
Tailwind CSS 4
Prisma
NextAuth
Vitest
```

The production Docker image uses a three-stage Docker build:

```text
Dependencies
      ↓
Builder
      ↓
Production Runner
```

The final image runs as a non-root `nextjs` user.

---

# 48. Next.js Configuration

The application uses:

```text
output: standalone
```

which allows the final Docker image to contain only the required standalone runtime.

The configuration also contains development origins for:

```text
localhost
127.0.0.1
ngrok domains
```

which supports development and tunnel-based testing.

---

# 49. Authentication

Authentication uses:

```text
NextAuth
```

with:

```text
Google OAuth
```

and:

```text
PrismaAdapter
```

Sessions use:

```text
JWT
```

rather than database sessions.

The session is enriched with:

```text
user.id
user.email
isStudent
```

The student flag is determined from the email suffix:

```text
@etu.univh2c.ma
```

---

# 50. Important Authentication Detail

The current authentication implementation **identifies** official student accounts through the `isStudent` flag.

The inspected NextAuth configuration itself does not explicitly reject every non-`@etu.univh2c.ma` Google account.

Therefore:

```text
Student detection
```

and:

```text
Student-only authorization
```

should not be treated as identical concepts.

This distinction should be addressed before presenting the application as strictly restricted to university accounts.

---

# 51. Conversation Persistence

Conversation data is stored in MariaDB through Prisma.

The frontend API supports:

```text
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id
PATCH  /api/conversations/:id
DELETE /api/conversations/:id
```

Authenticated requests are scoped using:

```text
session.user.id
```

This means one user does not simply receive every conversation in the database.

---

# 52. Conversation Ordering

Conversation listing uses:

```text
isPinned DESC
pinnedAt DESC
updatedAt DESC
```

This means pinned conversations appear first, followed by more recently updated conversations.

Pagination is supported using:

```text
skip
take
```

---

# 53. Database Design

The Prisma schema contains:

```text
User
Account
Session
VerificationToken
Conversation
Message
Report
```

The primary relationships are:

```text
User
 │
 ├── Accounts
 ├── Sessions
 ├── Conversations
 │        │
 │        └── Messages
 │                 │
 │                 └── Reports
 │
 └── Reports
```

---

# 54. User Model

The user stores:

```text
id
name
email
emailVerified
image
theme
voice
```

The inclusion of:

```text
theme
voice
```

shows that personalization is intended to be persisted.

---

# 55. Conversation Model

A conversation stores:

```text
id
title
userId
isPinned
pinnedAt
createdAt
updatedAt
```

This supports:

```text
chat history
pinning
sorting
persistence
```

---

# 56. Message Model

A message stores:

```text
text
sender
feedback
isStopped
isReported
conversationId
createdAt
```

This provides a foundation for:

```text
user messages
assistant responses
feedback
stopped generations
reported responses
```

---

# 57. Reports

The `Report` model links a report to:

```text
user
conversation
message
```

and stores:

```text
text
tags
isStoppedResponse
createdAt
```

This means the application has the data model required for structured user feedback and moderation workflows.

---

# 58. Voice / Text-to-Speech

The frontend declares:

```text
msedge-tts
```

as a dependency.

The User model stores:

```text
voice
```

with a default value:

```text
male
```

This supports a voice-oriented experience where the user can choose between different voices.

---

# 59. Static Faculty Information

An important implementation detail exists in the homepage.

The page currently contains an in-code `fsbmData` object with faculty information such as:

```text
name
university
administration
address
phones
emails
website
departments
```

Therefore there are currently **two kinds of FSBM information paths**:

```text
RAG Knowledge Base
      +
Frontend hardcoded presentation data
```

These are not automatically the same source of truth.

For long-term maintainability, the static frontend information should ideally be generated from the same authoritative dataset as the RAG system.

---

# 60. Mock Database Seeder

The frontend includes:

```text
prisma/seed.ts
```

The seeder creates:

```text
15 conversations
```

and several question/answer pairs in each conversation.

It also randomly marks approximately 10% of generated assistant messages as stopped.

The purpose is development/demo hydration, not real user data generation.

---

# 61. Observability Architecture

The monitoring architecture follows the three pillars:

```text
Metrics
Logs
Traces
```

with Grafana providing the unified visualization layer.

```text
                    APPLICATION
                        │
        ┌───────────────┼─────────────────┐
        │               │                 │
        ▼               ▼                 ▼
     Metrics          Logs             Traces
        │               │                 │
        ▼               ▼                 ▼
   Prometheus          Loki             Tempo
        │               │                 │
        └───────────────┼─────────────────┘
                        ▼
                     Grafana
```

---

# 62. Metrics — Prometheus

Prometheus scrapes the FastAPI backend at:

```text
backend:8000/metrics
```

It also scrapes:

```text
cadvisor:8080
```

The scrape interval is:

```text
5 seconds
```

This provides both:

```text
application-level metrics
```

and:

```text
container-level metrics
```

---

# 63. Custom RAG Metrics

The backend exposes:

```text
rag_retrieval_duration_seconds
```

This is a histogram measuring retrieval latency.

It also exposes:

```text
rag_retrieved_documents_count
```

which measures the number of retrieved documents.

Both use:

```text
intent
```

as a metric label.

---

# 64. LLM Generation Metric

The code declares:

```text
llm_tokens_generated_total
```

with:

```text
model
```

as the label.

### Important implementation note

The counter is incremented once for every streamed answer chunk.

Therefore, despite its name, the current value should not be interpreted as an exact count of model-generated tokens.

A more precise future implementation would obtain the actual token usage from the LLM runtime.

---

# 65. HTTP Metrics

FastAPI is instrumented using:

```text
prometheus-fastapi-instrumentator
```

The instrumentation captures:

```text
request rate
status codes
latency
in-progress requests
```

The metrics endpoint itself is excluded from instrumentation.

---

# 66. Logging — Promtail + Loki

Container logs follow:

```text
Docker containers
       │
       ▼
    Promtail
       │
       ▼
      Loki
       │
       ▼
    Grafana
```

Promtail discovers Docker containers through:

```text
/var/run/docker.sock
```

and adds the container name as a Loki label.

This means logs can be queried by container.

---

# 67. Structured Backend Logging

The FastAPI backend sends logs to stdout with:

```text
timestamp
log level
logger name
message
```

OpenTelemetry logging instrumentation is also enabled.

Trace identifiers can therefore be associated with application logs.

This enables a powerful debugging workflow:

```text
Metric spike
   ↓
Find affected request
   ↓
Open trace
   ↓
Find matching logs
   ↓
Identify failure
```

---

# 68. Distributed Tracing — Tempo

OpenTelemetry traces are exported through OTLP to:

```text
tempo:4317
```

The project explicitly creates spans around:

```text
rag_and_llm_generation
```

and:

```text
ground_emails_postprocess
```

The flow becomes:

```text
HTTP request
     │
     ▼
RAG generation span
     │
     ▼
LLM processing
     │
     ▼
Grounding span
     │
     ▼
Response
```

This is especially useful for identifying latency bottlenecks.

---

# 69. Grafana

Grafana is the visualization layer.

The project provisions data sources for:

```text
Prometheus
Loki
Tempo
```

Grafana is configured so traces can be connected to logs through the trace ID.

This creates:

```text
Trace
  │
  ▼
Trace ID
  │
  ▼
Matching Loki logs
```

without manually searching for log timestamps.

---

# 70. Container Monitoring — cAdvisor

cAdvisor collects container resource information.

The service has access to Docker and system information using read-only mounts.

This allows Prometheus/Grafana to observe:

```text
CPU
memory
container activity
resource usage
```

---

# 71. Alertmanager

Alertmanager receives Prometheus alerts.

The current rules include:

## Backend Down

```text
up{job="fastapi-backend"} == 0
```

for one minute.

## High RAG Latency

The 95th-percentile retrieval latency is considered high when it exceeds:

```text
8 seconds
```

for two minutes.

## High Error Rate

The HTTP 5xx error rate triggers when it exceeds:

```text
5%
```

for five minutes.

---

# 72. Alert Lifecycle

The operational flow is:

```text
Metric
  │
  ▼
Prometheus rule
  │
  ▼
Alert
  │
  ▼
Alertmanager
  │
  ▼
Notification
```

Alertmanager is configured to send notifications through Discord.

### Security note

The current `alertmanager.yml` contains a Discord webhook directly in the repository.

That credential should be **rotated and moved to a secret-management mechanism immediately**.

Never store production webhooks or tokens directly in Git.

---

# 73. Docker Architecture

The complete environment is orchestrated using:

```text
docker-compose.yml
```

The main services are:

```text
db
ollama
dagster
backend
frontend
prometheus
grafana
cadvisor
alertmanager
loki
promtail
tempo
```

---

# 74. Service Responsibilities

| Service        | Responsibility              |
| -------------- | --------------------------- |
| `db`           | MariaDB relational database |
| `ollama`       | Local LLM runtime           |
| `dagster`      | DataOps orchestration       |
| `backend`      | FastAPI + RAG engine        |
| `frontend`     | Next.js application         |
| `prometheus`   | Metrics collection          |
| `grafana`      | Monitoring UI               |
| `cadvisor`     | Container metrics           |
| `alertmanager` | Alert routing               |
| `loki`         | Log storage/query           |
| `promtail`     | Docker log collection       |
| `tempo`        | Distributed tracing         |

---

# 75. Service Communication

Docker Compose gives the services an internal network.

Therefore services communicate using service names.

Examples:

```text
backend → ollama:11434
frontend → backend:8000
frontend → db:3306
prometheus → backend:8000
prometheus → cadvisor:8080
promtail → loki:3100
backend → tempo:4317
grafana → prometheus:9090
grafana → loki:3100
grafana → tempo:3200
```

This means containers do not need to communicate through `localhost`.

Inside a container:

```text
localhost
```

means:

> this same container.

Whereas:

```text
backend
ollama
db
```

refer to other containers.

---

# 76. Persistent Storage

The project uses Docker volumes for stateful data.

Important volumes include:

```text
mariadb_data
ollama_models
huggingface_cache
shared_pipeline_data
vectorstore_cache
prometheus_data
grafana_data
```

Conceptually:

```text
Containers
   │
   ├── Application state
   ├── Database state
   ├── Model cache
   ├── DuckDB
   ├── Vector database
   └── Monitoring state
              │
              ▼
        Persistent Volumes
```

This prevents normal container recreation from automatically destroying all persistent state.

---

# 77. CI/CD Pipeline

GitHub Actions is defined in:

```text
.github/workflows/ci.yml
```

The workflow runs for:

```text
push:
    main
    dev

pull_request:
    main
    dev
```

The pipeline is organized into multiple stages.

---

# 78. CI Stage 1 — Python Linting

The pipeline first runs Python quality checks.

It uses:

```text
Python 3.11
Flake8
```

Critical syntax/runtime-related errors are blocking.

Style checks are currently non-blocking.

This gives:

```text
Code
 ↓
Lint
 ↓
Continue
```

rather than allowing obviously broken Python code to continue through the complete pipeline.

---

# 79. CI Stage 2 — Data Ingestion Tests

The workflow installs:

```text
pytest
duckdb
dlt
```

and runs:

```bash
pytest tests/dataops/ -v
```

Then it hydrates DuckDB using:

```bash
python ingest_dlt.py
```

The generated DuckDB is uploaded as an artifact.

This is a very useful CI pattern because later stages can consume the same generated database rather than repeatedly regenerating it.

---

# 80. CI Stage 3 — dbt Quality

The generated DuckDB is downloaded again.

Then:

```bash
dbt deps
dbt run
dbt test
```

are executed.

This validates the transformation layer.

The architecture becomes:

```text
dlt ingestion
      │
      ▼
DuckDB artifact
      │
      ▼
dbt
      │
      ├── run
      └── test
```

---

# 81. CI Stage 4 — LLM Service Validation

The workflow installs the backend dependencies and runs:

```bash
pytest tests/llm/ -v
```

The environment explicitly enables:

```text
ENABLE_METRICS=true
```

This validates the FastAPI/RAG-side code independently from Docker integration.

---

# 82. CI Stage 5 — Frontend Validation

The frontend CI stage:

```text
Node.js 20
   │
   ▼
npm ci
   │
   ▼
Prisma generate
   │
   ▼
ESLint
   │
   ▼
Vitest
```

The lint stage is currently non-blocking.

The web tests execute using:

```bash
npm test -- --run
```

---

# 83. CI Stage 6 — Dagster Orchestration

The workflow then validates that the complete DataOps orchestration actually works.

It:

1. creates the required paths
2. simulates the Docker-mounted DuckDB path
3. compiles the dbt manifest
4. executes Dagster asset materialization
5. uploads the resulting DuckDB

The key command is:

```bash
dagster asset materialize -f orchestration.py --select "*"
```

This verifies the relationship between:

```text
dlt
+
dbt
+
Dagster
```

---

# 84. CI Stage 7 — Full Docker Integration

This is where the project becomes a real integration test.

The workflow:

```text
Download DuckDB
      ↓
Add 10 GB swap
      ↓
Generate environment files
      ↓
Build Docker stack
      ↓
Start MariaDB
      ↓
Start Ollama
      ↓
Pull Qwen 2.5 3B
      ↓
Start complete stack
      ↓
Wait for backend initialization
      ↓
Run integration tests
      ↓
Run end-to-end tests
```

This is significantly stronger than testing each component in isolation.

---

# 85. Backend Readiness Validation

The CI pipeline waits until the backend emits:

```text
Chat engine successfully loaded and ready
```

This is important.

The Docker container being "running" does not necessarily mean:

```text
RAG engine ready
```

because the backend may still be:

```text
loading embeddings
connecting to vector store
initializing the LLM
```

The workflow therefore validates readiness through application logs.

---

# 86. CI Stage 8 — Docker Image Publishing

Only after full Docker integration succeeds does the main branch continue to image publishing.

The workflow pushes three images to Docker Hub:

```text
fsbm-backend
fsbm-frontend
fsbm-dagster
```

The current tags use:

```text
latest
```

---

# 87. CI Stage 9 — Automated Deployment

The final stage uses:

```text
Komodo
```

The workflow installs:

```text
komodo_client
```

and calls the Komodo API.

The deployed stack is:

```text
assistant_conversationnel_universitaire
```

The complete deployment chain is therefore:

```text
Git Push
   │
   ▼
GitHub Actions
   │
   ▼
Lint
   │
   ▼
Data Tests
   │
   ▼
dbt Tests
   │
   ▼
LLM Tests
   │
   ▼
Frontend Tests
   │
   ▼
Dagster
   │
   ▼
Docker Integration
   │
   ▼
Docker Hub
   │
   ▼
Komodo
   │
   ▼
Deployment
```

---

# 88. CI/CD Philosophy

The repository therefore implements:

```text
Continuous Integration
+
Container Integration
+
Artifact Passing
+
Container Registry
+
Automated Deployment
```

The important design decision is:

> **Deployment only happens after the full integration stage succeeds.**

---

# 89. Repository Structure

A conceptual map of the repository is:

```text
fsbm-chatbot-mlops-main/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── dataops/
│   ├── Dockerfile
│   ├── ingest_dlt.py
│   ├── orchestration.py
│   ├── requirements.txt
│   └── fsbm_transform/
│       ├── dbt_project.yml
│       ├── profiles.yml
│       └── models/
│           ├── sources.yml
│           └── staging/
│               ├── stg_departements.sql
│               ├── stg_emplois.sql
│               ├── stg_faculte.sql
│               ├── stg_formations.sql
│               ├── stg_laboratoires.sql
│               └── stg_professeurs.sql
│
├── llm-engine/
│   ├── Dockerfile
│   ├── main.py
│   └── src/
│       ├── chat_engine.py
│       ├── generate_title.py
│       ├── loader.py
│       ├── vectorstore.py
│       └── type_keywords.json
│
├── monitoring/
│   ├── prometheus.yml
│   ├── prometheus_rules.yml
│   ├── alertmanager.yml
│   ├── loki-config.yml
│   ├── promtail-config.yml
│   ├── tempo-config.yml
│   └── grafana/
│       ├── provisioning/
│       └── dashboards/
│
├── website/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── app/
│       │   ├── page.tsx
│       │   └── api/
│       │       ├── chat/
│       │       ├── auth/
│       │       └── conversations/
│       └── lib/
│           └── prisma.ts
│
├── tests/
│
├── deploy/
│
├── komodo/
│
├── docker-compose.yml
├── pyproject.toml
├── setup.ps1
└── README.md
```

---

# 90. API and Service Ports

| Component    |    Port | Purpose             |
| ------------ | ------: | ------------------- |
| Frontend     |  `3000` | Next.js application |
| Dagster      |  `3001` | Dagster UI          |
| FastAPI      |  `8000` | Backend API         |
| cAdvisor     |  `8080` | Container metrics   |
| Prometheus   |  `9090` | Metrics database/UI |
| Alertmanager |  `9093` | Alert management    |
| Loki         |  `3100` | Log aggregation     |
| Tempo        |  `3200` | Trace query API     |
| Tempo OTLP   |  `4317` | OTLP gRPC ingestion |
| Ollama       | `11434` | LLM inference       |
| MariaDB      |  `3306` | Relational database |

---

# 91. Local Installation

## Prerequisites

Install:

```text
Docker
Docker Compose
Git
```

For local development you may also use:

```text
Python 3.11
Node.js 20
```

---

# 92. Clone the Repository

```bash
git clone https://github.com/MOHAMMED-ESSEDIK/fsbm-chatbot-mlops-main.git
cd fsbm-chatbot-mlops-main
```

---

# 93. Environment Variables

The backend accepts:

```env
HF_TOKEN=...
ENABLE_METRICS=true
OLLAMA_BASE_URL=http://ollama:11434
HF_HOME=/root/.cache/huggingface
DUCKDB_PATH=/app/data/duckdb/fsbm.duckdb
VECTORSTORE_PATH=/app/vectorstore
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4317
OTEL_SERVICE_NAME=fsbm-fastapi-backend
```

The frontend uses values such as:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
BACKEND_URL=...
DATABASE_URL=...
```

Never commit real secrets.

---

# 94. Recommended Local Startup Sequence

The repository contains:

```text
setup.ps1
```

which automates the main startup process on PowerShell.

The logical sequence is:

```text
1. Remove previous environment
2. Build fresh Docker images
3. Start MariaDB + Ollama
4. Wait for Ollama
5. Pull qwen2.5:3b
6. Start Dagster
7. Materialize DataOps
8. Start backend + frontend + monitoring
```

---

# 95. Linux/macOS Manual Equivalent

Start database and Ollama:

```bash
docker compose up -d db ollama
```

Wait until Ollama responds:

```bash
until docker exec fsbm-ollama ollama list >/dev/null 2>&1; do
  sleep 3
done
```

Pull the model:

```bash
docker exec fsbm-ollama ollama pull qwen2.5:3b
```

Start Dagster:

```bash
docker compose up -d dagster
```

Materialize the DataOps pipeline:

```bash
docker exec fsbm-dagster \
  dagster asset materialize \
  -f orchestration.py \
  --select "*"
```

Then start the complete stack:

```bash
docker compose up -d
```

---

# 96. First Backend Startup

On the first successful startup, expect the backend to:

```text
1. Connect to DuckDB
2. Load clean_data
3. Build LangChain documents
4. Load multilingual-e5-large
5. Generate embeddings
6. Insert embeddings into Chroma
7. Create identifier indexes
8. Initialize Qwen through Ollama
9. Start FastAPI
```

The embedding model is relatively large, so the first construction can be significantly slower than subsequent restarts.

---

# 97. Why Subsequent Starts Are Faster

Once:

```text
vectorstore_cache
```

contains the Chroma database:

```text
backend startup
       │
       ▼
Chroma exists
       │
       ▼
Skip rebuilding
       │
       ▼
Start chat engine
```

This avoids re-embedding the same documents every time the container restarts.

---

# 98. Updating the Knowledge Base

A source-data update follows:

```text
Modify JSON
    ↓
Run dlt
    ↓
Run dbt
    ↓
Produce updated clean_data
    ↓
Rebuild vector store
```

The current implementation does not automatically invalidate the existing Chroma database when the underlying DuckDB changes.

Therefore a production-grade system should eventually add:

```text
data version
+
embedding version
+
automatic vector-store refresh
```

---

# 99. Testing

The repository uses:

```text
pytest
```

with:

```text
tests/
```

as the main test location.

The Python project configuration also includes:

```text
llm-engine
dataops
```

in the Python path.

Run all Python tests:

```bash
pytest
```

---

# 100. DataOps Tests

```bash
pytest tests/dataops/ -v
```

These validate the data pipeline layer independently.

---

# 101. LLM Tests

```bash
pytest tests/llm/ -v
```

These validate the backend / AI logic.

---

# 102. Frontend Tests

From `website/`:

```bash
npm test -- --run
```

The project uses:

```text
Vitest
Testing Library
```

---

# 103. Integration Tests

The CI pipeline also executes:

```bash
pytest tests/integration/ -v
```

and:

```bash
bash tests/e2e_integration.sh
```

These tests validate the application after the Docker stack is actually running.

This is important because unit tests alone cannot validate:

```text
frontend → backend → Ollama
```

or:

```text
backend → vectorstore → DuckDB
```

in a realistic environment.

---

# 104. Important Engineering Decision — Local LLM

The project deliberately uses:

```text
Ollama + Qwen 2.5 3B
```

rather than making the chatbot dependent on a remote API.

Advantages:

```text
Local inference
Data locality
No per-request external API dependency
Reproducible model runtime
Containerized deployment
```

Trade-offs:

```text
Higher local hardware requirements
Model download size
Inference latency
Limited concurrency compared with larger serving platforms
```

---

# 105. Important Engineering Decision — Hybrid Retrieval

The retriever is not purely semantic.

It combines:

```text
Exact identifiers
+
Intent filtering
+
Semantic similarity
+
General fallback retrieval
```

This is particularly useful for structured university information where exact entities matter.

---

# 106. Important Engineering Decision — Semantic Document Enrichment

The loader does not blindly embed database rows.

It first creates richer documents that include relationships such as:

```text
Professor
   ↓
Laboratory
   ↓
Research team
```

and:

```text
Formation
   ↓
Coordinator
   ↓
Coordinator email
   ↓
Coordinator laboratory
   ↓
Laboratory director
```

This reduces the number of multi-hop retrieval operations required at inference time.

---

# 107. Important Engineering Decision — Streaming

The application streams generated text using SSE.

This improves perceived latency because the user does not have to wait for the entire answer before seeing anything.

The architecture is:

```text
LLM
 │
 ├── chunk 1 ──► browser
 ├── chunk 2 ──► browser
 ├── chunk 3 ──► browser
 └── final ────► browser
```

---

# 108. Important Engineering Decision — Post-Processing

Not every correctness problem should be solved by prompting the LLM harder.

Structured fields such as:

```text
email
phone
URL
identifier
```

are better handled with deterministic verification.

This project therefore combines:

```text
Generative AI
+
Deterministic validation
```

instead of relying entirely on probabilistic generation.

---

# 109. Current Limitations

The repository already demonstrates a broad MLOps architecture, but several areas can be improved.

## 109.1 Intent Classification

The LLM fallback classifier exists but is disabled.

Therefore the active classifier is:

```text
keyword matching
```

This can fail on questions whose vocabulary does not match the configured keyword bank.

---

## 109.2 Vector Store Refresh

The vector store is skipped if Chroma already exists.

Therefore updated source data does not automatically imply updated embeddings.

A future solution should use:

```text
dataset version
embedding version
checksum
data freshness
```

to trigger selective rebuilding.

---

## 109.3 LLM Token Metric

The metric called:

```text
llm_tokens_generated_total
```

currently increments by streamed chunk.

It is therefore not an exact token accounting metric.

---

## 109.4 Authentication Restriction

The current code identifies `@etu.univh2c.ma` accounts but the inspected NextAuth configuration does not by itself enforce a strict student-only sign-in policy.

A production implementation should explicitly define authorization policy.

---

## 109.5 Hardcoded Frontend Data

Some FSBM information is hardcoded directly inside:

```text
website/src/app/page.tsx
```

This creates a potential consistency problem between:

```text
frontend static data
```

and:

```text
RAG knowledge data
```

A single source of truth would be preferable.

---

## 109.6 Docker Tags

CI publishes:

```text
latest
```

rather than immutable version tags or digests.

A stronger deployment strategy would use:

```text
commit SHA
release version
image digest
```

for reproducibility.

---

## 109.7 CORS

The backend currently allows:

```text
allow_origins=["*"]
```

This is convenient for development but should be narrowed in production.

---

## 109.8 Default Credentials

The Compose file contains development-style credentials for components such as MariaDB and Grafana.

Production must use secrets.

---

# 110. Production Hardening

Before describing the system as production-ready, the following improvements should be made.

## Secrets

Move:

```text
Google OAuth credentials
database passwords
HF token
Discord webhook
NextAuth secret
Komodo credentials
Docker Hub credentials
```

to proper secret management.

---

## Security

Implement:

```text
HTTPS
restricted CORS
strong database credentials
non-root services where possible
network isolation
rate limiting
authentication-based API authorization
```

---

## Data Reliability

Introduce:

```text
data validation
schema contracts
freshness checks
source versioning
pipeline failure alerts
vector-store versioning
```

---

## MLOps

Introduce:

```text
model version tracking
evaluation datasets
RAG retrieval evaluation
answer-quality metrics
experiment tracking
model registry where necessary
```

---

# 111. Recommended Future Architecture

A more mature version can evolve toward:

```text
                     GIT
                      │
                      ▼
                    CI/CD
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
       Data Pipeline       Application Build
            │                   │
            ▼                   ▼
      Data Quality         Docker Images
            │                   │
            └──────────┬────────┘
                       ▼
                    Registry
                       │
                       ▼
                  Deployment
                       │
            ┌──────────┼───────────┐
            ▼          ▼           ▼
         Frontend   Backend      Dagster
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
          Chroma     Ollama     MariaDB
            │          │
            └────┬─────┘
                 ▼
             AI System
                 │
       ┌─────────┼──────────┐
       ▼         ▼          ▼
  Prometheus    Loki      Tempo
       └─────────┼──────────┘
                 ▼
              Grafana
```

---

# 112. Future MLOps Enhancements

A mature MLOps version could add:

```text
MLflow
```

for experiment/model tracking.

A model registry could distinguish:

```text
development
staging
production
```

RAG evaluation could measure:

```text
retrieval precision
retrieval recall
context relevance
answer faithfulness
answer correctness
```

This would transform the project from:

```text
RAG application
```

into:

```text
measurable RAG/LLM platform
```

---

# 113. Future DataOps Enhancements

Potential improvements include:

```text
Great Expectations / Soda
data contracts
schema evolution
incremental dlt loads
data lineage
data freshness checks
automatic vector-store rebuilds
pipeline scheduling
```

The long-term target would be:

```text
Source
 ↓
Ingestion
 ↓
Data Quality
 ↓
Transformation
 ↓
Data Quality
 ↓
Knowledge Generation
 ↓
Embedding
 ↓
Vector Store
```

---

# 114. Future Observability Enhancements

The current observability stack can be expanded with:

```text
LLM latency
tokens/sec
time-to-first-token
RAG latency
LLM latency
embedding latency
vector-store size
retrieval hit rate
answer failure rate
model error rate
```

This would allow the project to answer not only:

> Is the service alive?

but also:

> Is the AI actually performing well?

---

# 115. The Three Main Pipelines

The complete platform can be understood through three independent pipelines.

## Pipeline A — Data

```text
JSON
 ↓
dlt
 ↓
DuckDB raw_data
 ↓
dbt
 ↓
DuckDB clean_data
```

## Pipeline B — AI

```text
Question
 ↓
Intent / Identifier Detection
 ↓
Hybrid Retrieval
 ↓
Context
 ↓
Qwen
 ↓
Grounding
 ↓
Answer
```

## Pipeline C — Operations

```text
Application
 ↓
Metrics / Logs / Traces
 ↓
Prometheus / Loki / Tempo
 ↓
Grafana / Alertmanager
```

Together:

```text
             ┌──────────────────┐
             │   DATA PIPELINE  │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │   KNOWLEDGE BASE │
             └────────┬─────────┘
                      │
                      ▼
USER ───────► ┌──────────────────┐
              │   AI PIPELINE   │
              └────────┬─────────┘
                       │
                       ▼
                    ANSWER
                       │
                       ▼
              ┌──────────────────┐
              │ OBSERVABILITY    │
              └──────────────────┘
```

---

# 116. Why This Is an MLOps / DataOps Project

The project contains far more than an LLM call.

It demonstrates:

```text
✓ Data ingestion
✓ Data transformation
✓ Data modeling
✓ Pipeline orchestration
✓ Data persistence
✓ Semantic document construction
✓ Embedding generation
✓ Vector search
✓ RAG
✓ Local LLM inference
✓ API engineering
✓ Streaming
✓ Authentication
✓ Relational persistence
✓ Docker
✓ Metrics
✓ Logs
✓ Distributed tracing
✓ Alerting
✓ Unit tests
✓ Integration tests
✓ E2E tests
✓ CI/CD
✓ Container registry
✓ Automated deployment
```

The central engineering lesson is:

> **A useful AI system is an entire platform surrounding the model.**

---

# 117. Key Technologies

| Technology            | Main Role                     |
| --------------------- | ----------------------------- |
| Python                | AI and DataOps implementation |
| dlt                   | Data ingestion                |
| DuckDB                | Local analytical database     |
| dbt                   | SQL transformations           |
| Dagster               | Data pipeline orchestration   |
| LangChain             | RAG/LLM orchestration         |
| Hugging Face          | Embeddings                    |
| multilingual-e5-large | Semantic embeddings           |
| Chroma                | Vector store                  |
| Ollama                | Local LLM runtime             |
| Qwen 2.5 3B           | Language model                |
| FastAPI               | Backend API                   |
| Next.js               | Frontend                      |
| React                 | UI                            |
| TypeScript            | Frontend type safety          |
| Tailwind CSS          | Styling                       |
| Prisma                | Database ORM                  |
| NextAuth              | Authentication                |
| MariaDB               | Relational persistence        |
| Prometheus            | Metrics                       |
| Grafana               | Observability UI              |
| Loki                  | Logs                          |
| Promtail              | Log collection                |
| Tempo                 | Tracing                       |
| OpenTelemetry         | Trace instrumentation         |
| Alertmanager          | Alerts                        |
| cAdvisor              | Container monitoring          |
| Docker Compose        | Local orchestration           |
| GitHub Actions        | CI/CD                         |
| Docker Hub            | Image registry                |
| Komodo                | Deployment                    |

---

# 118. Source Files Worth Studying

A developer trying to understand the project should read the code in roughly this order:

```text
1. docker-compose.yml
2. dataops/ingest_dlt.py
3. dataops/orchestration.py
4. dataops/fsbm_transform/models/sources.yml
5. dataops/fsbm_transform/models/staging/*.sql
6. llm-engine/src/loader.py
7. llm-engine/src/vectorstore.py
8. llm-engine/src/chat_engine.py
9. llm-engine/main.py
10. website/src/app/api/chat/route.ts
11. website/src/app/api/auth/[...nextauth]/route.ts
12. website/src/app/api/conversations/*
13. website/prisma/schema.prisma
14. monitoring/*
15. .github/workflows/ci.yml
```

This order follows the system's actual dependency chain:

```text
Infrastructure
   ↓
Data
   ↓
Transformation
   ↓
Knowledge
   ↓
Retrieval
   ↓
LLM
   ↓
API
   ↓
Frontend
   ↓
Persistence
   ↓
Observability
   ↓
CI/CD
```

---

# 119. Final Architecture Summary

The entire FSBM Assistant platform can be summarized as:

```text
                           ┌──────────────────────┐
                           │      RAW JSON        │
                           │    FSBM knowledge    │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │         dlt          │
                           │      ingestion       │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │       DuckDB         │
                           │      raw_data        │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │         dbt          │
                           │ transform + test     │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │       clean_data     │
                           │   staging models     │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │   Python Data Loader │
                           │ semantic enrichment  │
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │ HuggingFace Embedding│
                           │ multilingual-e5-large│
                           └──────────┬───────────┘
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │       Chroma         │
                           │     vector store     │
                           └──────────┬───────────┘
                                      │
                                      │
USER ─────► Next.js ─────► FastAPI ───┤
                                      │
                        ┌─────────────┴──────────────┐
                        ▼                            ▼
                 Intent / Exact IDs           Similarity Search
                        │                            │
                        └─────────────┬──────────────┘
                                      ▼
                                Final Context
                                      │
                                      ▼
                           ┌──────────────────────┐
                           │       Ollama         │
                           │      Qwen 2.5 3B     │
                           └──────────┬───────────┘
                                      │
                                      ▼
                              Generated Answer
                                      │
                                      ▼
                         Exact Email Grounding
                                      │
                                      ▼
                                SSE Stream
                                      │
                                      ▼
                                  Frontend
                                      │
                                      ▼
                                   User


       ┌────────────────────────────────────────────────────┐
       │                   OBSERVABILITY                     │
       │                                                    │
       │  Metrics ─────► Prometheus ──────► Grafana         │
       │  Logs ────────► Promtail ────────► Loki            │
       │  Traces ──────► OpenTelemetry ───► Tempo           │
       │  Alerts ──────► Alertmanager                        │
       │  Containers ──► cAdvisor                           │
       └────────────────────────────────────────────────────┘


       ┌────────────────────────────────────────────────────┐
       │                     CI / CD                         │
       │                                                    │
       │ GitHub Push                                        │
       │      ↓                                             │
       │ Lint → Tests → dbt → Dagster → Docker Integration │
       │      ↓                                             │
       │ Docker Hub                                         │
       │      ↓                                             │
       │ Komodo Deployment                                  │
       └────────────────────────────────────────────────────┘
```

---

# 120. Author

**Mohammed Essedik**

Master's student in Big Data & Data Science
Faculty of Sciences Ben M'Sik — Hassan II University of Casablanca

GitHub:

`MOHAMMED-ESSEDIK`

---

# 📄 License

Add the project's chosen license here when one is officially selected and committed to the repository.

---

## 🔗 Main Project Files

For implementation details, see:

* [`docker-compose.yml`](./docker-compose.yml)
* [`dataops/ingest_dlt.py`](./dataops/ingest_dlt.py)
* [`dataops/orchestration.py`](./dataops/orchestration.py)
* [`dataops/fsbm_transform/dbt_project.yml`](./dataops/fsbm_transform/dbt_project.yml)
* [`llm-engine/main.py`](./llm-engine/main.py)
* [`llm-engine/src/chat_engine.py`](./llm-engine/src/chat_engine.py)
* [`llm-engine/src/loader.py`](./llm-engine/src/loader.py)
* [`llm-engine/src/vectorstore.py`](./llm-engine/src/vectorstore.py)
* [`website/prisma/schema.prisma`](./website/prisma/schema.prisma)
* [`monitoring/prometheus.yml`](./monitoring/prometheus.yml)
* [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)
