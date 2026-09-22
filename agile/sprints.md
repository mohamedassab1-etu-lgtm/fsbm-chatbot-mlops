# Planification des Sprints : Assistant Conversationnel FSBM

## SPRINT 1 : "Fondations, Plomberie et Données Brutes"
**Objectif du Sprint :** Mettre en place les environnements de travail de chacun, sécuriser l'ingestion des premières données brutes, et faire communiquer le frontend avec un backend initial.

* **Facilitateur Agile :**
  * **US-1.1 & US-1.2 :** Rédiger la vision du projet, créer le backlog et configurer le tableau Kanban sur Jira.
  * **US-1.3 :** Animer le Sprint Planning pour assigner les tâches initiales d'infrastructure.

* **Data Engineer :**
  * **US-2.1 :** Configurer l'environnement local et développer les scripts d'ingestion `dlt` pour charger les JSON non structurés dans la base DuckDB brute.

* **Scrum Master – Développeur LLM :**
  * **US-3.1 :** Initialiser le projet FastAPI (structure, route `/health`) et préparer le terrain pour le flux SSE (Server-Sent Events).

* **Product Owner - Développeur Web :**
  * **US-4.1 :** Initialiser le projet Next.js (App Router) avec Tailwind CSS et configurer la bascule Dark/Light mode natif.

* **Deployment Engineer :**
  * **US-6.1 (Partiel) :** Écrire les premiers Dockerfiles isolés (multi-stage) pour encapsuler l'API FastAPI et l'application Next.js.

* **Observability Engineer :**
  * **US-7.1 :** Provisionner la base de la stack PLTG (Prometheus, Loki, Tempo, Grafana) via Docker Compose pour préparer l'observabilité locale.


## SPRINT 2 : "Transformation, Nettoyage et Premier Cerveau"
**Objectif du Sprint :** Les données doivent être structurées pour le LLM, et l'architecture RAG (Retrieval) doit commencer à fonctionner avec le modèle local.

* **Facilitateur Agile :**
  * **US-1.4 & US-1.5 :** Surveiller l'avancement via les Daily Stand-ups, animer la première Sprint Review et la Rétrospective.

* **Data Engineer :**
  * **US-2.2 :** Développer les modèles dbt (staging) pour nettoyer et dénormaliser les tables éclatées par dlt.
  * **US-2.3 :** Faire du Feature Engineering JSON via DuckDB pour reconstruire les hiérarchies (emplois du temps, laboratoires).

* **Scrum Master – Développeur LLM :**
  * **US-3.2 :** Configurer ChromaDB et générer les embeddings vectoriels avec `intfloat/multilingual-e5-large`.
  * **US-3.3 :** Intégrer Ollama localement avec le modèle `qwen2.5:3b` (température à 0.0).

* **Product Owner - Développeur Web :**
  * **US-4.2 :** Mettre en place l'authentification sécurisée NextAuth (Google OAuth) avec la détection des badges étudiants `@etu.univh2c.ma`.
  * **US-4.3 :** Initialiser Prisma ORM avec MariaDB pour structurer les tables `User`, `Conversation` et `Message`.

* **Deployment Engineer :**
  * **US-6.2 :** Créer le fichier `docker-compose.yml` global pour lier la base de données (MariaDB, DuckDB), Ollama, le Backend et le Frontend.


## SPRINT 3 : "Intelligence, Orchestration et CI/CD"
**Objectif du Sprint :** Le chatbot doit répondre de manière fiable grâce au contexte, l'interface doit être réactive, et l'infrastructure de test doit s'automatiser.

* **Data Engineer :**
  * **US-2.6 :** Développer le graphe Dagster unifiant l'ingestion (`@multi_asset`) et la transformation (`@dbt_assets`) en un seul flux d'orchestration automatisé.

* **Scrum Master – Développeur LLM :**
  * **US-3.4 :** Développer le Smart Retrieval RAG (Classificateur d'intentions et recherche par correspondance exacte d'identifiants).
  * **US-3.5 :** Implémenter l'algorithme de Fact-Grounding (Regex) pour forcer la correction des adresses emails générées par le LLM.

* **Product Owner - Développeur Web :**
  * **US-4.4 :** Consommer le flux SSE en direct sur le Frontend pour un affichage "machine à écrire", et intégrer les boutons d'action (Stop, Redo, Edit).

* **Integration Engineer :**
  * **US-5.1 :** Créer le premier pipeline GitHub Actions (Linting `flake8` bloquant sur le code Python).
  * **US-5.3 :** Ajouter la validation continue des services web (tests FastAPI et build statique Next.js).

* **Observability Engineer :**
  * **US-7.2 :** Configurer l'Infrastructure-as-Code de Grafana pour auto-provisionner les sources de données et tableaux de bord applicatifs.


## SPRINT 4 : "Industrialisation, Qualité et Observabilité (MLOps)"
**Objectif du Sprint :** Figer la qualité des données (contrats), activer les fonctionnalités multimédias (voix), et finaliser la CI de bout-en-bout.

* **Data Engineer :**
  * **US-2.4 & US-2.5 :** Implémenter les Data Contracts stricts (`dbt-expectations`) et les tests d'intégrité référentielle pour sécuriser le pipeline IA.

* **Scrum Master – Développeur LLM :**
  * **US-3.6 :** Ajouter la détection linguistique (`lingua`) et la génération de titres de conversation asynchrone.
  * **US-3.7 :** Instrumenter le code backend avec OpenTelemetry pour tracer manuellement les spans (Génération RAG, Post-processing).

* **Product Owner - Développeur Web :**
  * **US-4.5 :** Intégrer la Web Speech API (STT) et Microsoft Edge Neural Voices (TTS) pour l'interaction vocale.
  * **US-4.6 :** Développer le moteur de recherche plein texte de l'historique des conversations avec calcul de score de pertinence.

* **Integration Engineer & Deployment Engineer :**
  * **US-5.2 & US-5.4 :** Automatiser l'exécution de dbt test dans la CI et lancer les tests End-to-End post-Docker.
  * **US-6.4 :** Configurer le Buildx et le Push automatisé des images sur Docker Hub depuis GitHub Actions.

* **Observability Engineer :**
  * **US-7.3 :** Activer la fonction `tracesToLogsV2` pour corréler les requêtes Tempo aux logs Loki (Promtail).
  * **US-7.4 & US-7.5 :** Finaliser les Dashboards RAG et MLOps (suivi des Tokens/sec et de la latence P95).


## SPRINT 5 : "Polissage, Déploiement et Préparation Soutenance"
**Objectif du Sprint :** Code Freeze (gel du code). L'équipe se concentre sur le déploiement en production (VPS), la gestion des incidents (alertes) et la préparation du livrable final.

* **Facilitateur Agile :**
  * **US-1.6 :** Coordonner la création des diapositives techniques (DataOps, Docker, CI/CD, Next.js) et organiser les répétitions chronométrées (soutenances blanches).

* **Product Owner - Développeur Web :**
  * **US-4.7 :** Déployer les modales de Feedback (Like/Dislike, Signalement de bugs) pour enrichir la base de données et préparer de futures itérations du modèle.

* **Deployment Engineer :**
  * **US-6.3 :** Finaliser le script `setup.ps1` gérant le boot asynchrone, le téléchargement du modèle Ollama et la matérialisation Dagster.
  * **US-6.5 :** Développer le script SDK Node.js final dans GitHub Actions pour invoquer le webhook Komodo et redéployer la stack automatiquement en production.

* **Observability Engineer :**
  * **US-7.6 :** Configurer les règles Alertmanager (Erreurs 5xx, Backend Down) et les lier au Webhook du serveur Discord de l'équipe pour un monitoring proactif.
