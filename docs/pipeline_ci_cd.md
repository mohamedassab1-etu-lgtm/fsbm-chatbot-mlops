# Documentation du Pipeline CI/CD MLOps (Assistant Conversationnel FSBM)

**Version :** 1.0.0
**Domaine :** Ingénierie Backend, DataOps et Déploiement
**Infrastructure :** GitHub Actions, Docker, Komodo

---

## 1. Vue d'Ensemble de l'Architecture CI/CD

Le pipeline d'Intégration et de Déploiement Continus (CI/CD) de l'Assistant Conversationnel de la FSBM est conçu pour garantir une qualité de code stricte, la validation des contrats de données, et l'intégrité du moteur LLM avant tout déploiement en production. Construit sur GitHub Actions, ce workflow se déclenche automatiquement lors des événements `push` et `pull_request` sur les branches `main` et `dev`.

L'architecture est structurée sous forme de graphe orienté acyclique (DAG), où les étapes de déploiement dépendent de la validation préalable de tests unitaires, d'intégration, et d'orchestration des données.

---

## 2. Graphe d'Exécution et Dépendances (Jobs)

Le pipeline est divisé en 9 travaux (jobs) distincts, exécutés sur des runners `ubuntu-latest` :

| Job | Description | Dépendances (`needs`) |
| --- | --- | --- |
| `python-lint` | Analyse statique du code Python (erreurs critiques et style). | Aucune |
| `data-pipeline-ingestion` | Ingestion des données brutes vers DuckDB via `dlt`. | `python-lint` |
| `llm-service-validation` | Tests unitaires du backend FastAPI et du moteur RAG. | `python-lint` |
| `frontend-validation` | Tests du client Next.js (npm, prisma, lint). | `python-lint` |
| `data-quality-contracts` | Tests des modèles et de la qualité des données via `dbt`. | `data-pipeline-ingestion` |
| `dagster-orchestration` | Matérialisation des assets de données via l'orchestrateur. | `data-quality-contracts` |
| `docker-integration` | Tests E2E post-conteneurisation avec la stack complète. | `dagster-orchestration`, `llm-service-validation`, `frontend-validation` |
| `docker-push` | Publication des images finales sur Docker Hub. | `docker-integration` (uniquement sur `main`) |
| `komodo-deploy` | Déploiement automatisé sur serveur via le SDK Komodo. | `docker-push` (uniquement sur `main`) |

---

## 3. Détail des Phases d'Intégration Continue (CI)

### 3.1. Qualité du Code (Linting)

Le job `python-lint` utilise `flake8` pour analyser les répertoires `./llm-engine` et `./dataops`.

* Il bloque immédiatement le pipeline si des erreurs de syntaxe critiques (ex. : `E9, F63, F7, F82`) sont détectées.


* Une seconde exécution non bloquante (`continue-on-error: true`) signale les problèmes de style (ex. : complexité cyclomatique > 10, longueur de ligne > 127).



### 3.2. DataOps et Contrats de Données

Ce sous-système garantit que le moteur RAG ne recevra aucune donnée hallucinée ou mal formatée.

* **Ingestion (`data-pipeline-ingestion`) :** Exécute les tests unitaires `pytest` sur le module de données, puis lance `ingest_dlt.py` pour hydrater une base locale DuckDB à partir des sources JSON brutes. Le fichier `fsbm.duckdb` résultant est stocké comme artefact GitHub.


* **Transformation et Tests (`data-quality-contracts`) :** Récupère l'artefact DuckDB, simule un montage de volume Docker (`/app/data/duckdb`), et exécute `dbt deps`, `dbt run`, et `dbt test` pour valider l'intégrité référentielle et les règles métier. L'artefact finalisé est sauvegardé pour l'orchestrateur.



### 3.3. Validation des Services (Backend LLM & Frontend)

En parallèle des tâches DataOps, les services applicatifs sont testés :

* **Backend MLOps (`llm-service-validation`) :** Exécute `pytest tests/llm/ -v` en simulant l'activation des métriques Prometheus (`ENABLE_METRICS: "true"`) pour valider la logique de l'API FastAPI, de LangChain, et de la génération RAG.


* **Frontend Web (`frontend-validation`) :** Installe les dépendances Node 20 (`npm ci --legacy-peer-deps`), génère le client Prisma ORM, et lance les tests web.



### 3.4. Orchestration Dagster

Le job `dagster-orchestration` agit comme le point de convergence final de la donnée avant la conteneurisation. Il recompile le manifeste dbt et utilise `dagster asset materialize -f orchestration.py --select "*"` pour exécuter l'intégralité du pipeline d'ingestion et de transformation via le graphe d'assets.

---

## 4. Phase d'Intégration Système (Conteneurisation)

Le job `docker-integration` monte l'ensemble de la stack logicielle dans l'environnement GitHub Actions pour des tests de bout en bout (E2E).

1. **Prévention OOM (Out Of Memory) :** Allocation dynamique de 10 Go d'espace Swap via l'action `pierotofy/set-swap-space` pour éviter les plantages lors du chargement des modèles LLM en mémoire.


2. **Injection de l'Environnement :** Création à la volée des fichiers `.env` et `.env.local` contenant les identifiants OAuth Google, le secret NextAuth, et les variables d'infrastructure système.


3. **Séquence de Démarrage Asynchrone :**
* Démarrage exclusif des conteneurs `db` (MySQL) et `ollama`.


* Attente active de la disponibilité de l'API Ollama, suivie du téléchargement synchrone du modèle `qwen2.5:3b` dans le conteneur.


* Démarrage du reste de la stack (Backend, Frontend, Observabilité) avec injection du token Hugging Face (`HF_TOKEN`).




4. **Validation d'Initialisation :** Un script bash scrute les journaux de `fsbm-backend` en temps réel, attendant le message exact `"Chat engine successfully loaded and ready"` avant d'autoriser la suite (avec un délai d'attente maximum de 15 minutes).


5. **Tests d'Intégration (E2E) :** Exécution de la suite `pytest tests/integration/` et du script E2E `tests/e2e_integration.sh` sur les conteneurs en direct.



---

## 5. Déploiement Continu (CD) vers la Production

Les étapes de livraison et de déploiement sont strictement réservées à la branche `main` et ne s'exécutent que si tous les tests d'intégration Docker réussissent.

* **Publication des Artefacts (`docker-push`) :** Authentification auprès de Docker Hub, compilation (via Docker Buildx) et publication des images finales pour les composants `fsbm-backend:latest`, `fsbm-frontend:latest`, et `fsbm-dagster:latest`.


* **Déploiement Automatisé (`komodo-deploy`) :** Exécution d'un script Node.js minimaliste utilisant le SDK officiel `komodo_client`. Le script s'authentifie via clé API sur le serveur Komodo (`[https://komodo.s3.fsbm.ma](https://komodo.s3.fsbm.ma)`) et déclenche la commande `DeployStack` pour mettre à jour la stack de production `assistant_conversationnel_universitaire`.



---

## 6. Répertoire des Secrets GitHub Actions

Le pipeline requiert la configuration des secrets d'environnement suivants pour fonctionner :

| Clé du Secret | Usage dans le Pipeline |
| --- | --- |
| `HF_TOKEN` | Permet au backend de télécharger le modèle d'embedding `multilingual-e5-large` depuis Hugging Face sans restriction de limite de taux.

 |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Configuration du fournisseur d'identité OAuth2 pour le module NextAuth du Frontend.

 |
| `NEXTAUTH_SECRET` | Clé de chiffrement cryptographique pour la gestion des sessions JWT Next.js.

 |
| `DOCKERHUB_USERNAME` / `_TOKEN` | Authentification pour pousser les images conteneurisées compilées vers le registre d'images Docker Hub.

 |
| `KOMODO_API_KEY` / `_SECRET` | Authentification distante pour déclencher le redéploiement (pull/restart) sur le serveur de production Komodo.

 |