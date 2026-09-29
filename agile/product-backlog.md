# Product Backlog : Assistant Conversationnel FSBM

## Épique 1 : Gestion Agile & Coordination (Assigné : Scrum Master)

* **US-1.1 (Vision du Projet) :** En tant que Scrum Master, je veux rédiger le document de problématique et d'objectifs métiers pour aligner l'équipe sur la création d'un assistant sans hallucination.


* **US-1.2 (Création du Backlog) :** En tant que Scrum Master, je veux intégrer et structurer toutes les User Stories dans Jira pour une gestion de projet centralisée.


* **US-1.3 (Sprint Planning) :** En tant que Scrum Master, je veux animer la planification des sprints pour définir les objectifs d'infrastructure, de modélisation et de développement.


* **US-1.4 (Sprint Review & Retrospective) :** En tant que Scrum Master, je veux organiser des revues et rétrospectives régulières pour évaluer l'avancement technique et ajuster la vélocité de l'équipe.


* **US-1.5 (Tableau Kanban) :** En tant que Scrum Master, je veux configurer un board Jira clair pour suivre l'état d'avancement quotidien des tâches d'ingénierie.


* **US-1.6 (Préparation Soutenance) :** En tant que Scrum Master, je veux coordonner la création des diapositives techniques et l'orchestration de la démonstration de bout-en-bout.



## Épique 2 : Pipeline DataOps & Data Contracts (Assigné : Data Engineer)

* **US-2.1 (Ingestion dlt) :** En tant que Data Engineer, je veux configurer `dlt` pour ingérer les sources JSON non structurées et les charger automatiquement dans la base locale DuckDB.


* **US-2.2 (Reconstruction des Entités) :** En tant que Data Engineer, je veux utiliser `dbt` (modèles de staging) pour regrouper les tables éclatées par l'ingestion (ex: associer les emails éclatés aux profils professeurs via `list()`).


* **US-2.3 (Feature Engineering JSON) :** En tant que Data Engineer, je veux consolider les hiérarchies complexes (emplois du temps, équipes de laboratoires) en objets JSON interrogeables via le cast DuckDB.


* **US-2.4 (Data Contracts) :** En tant que Data Engineer, je veux implémenter `dbt-expectations` pour figer le schéma final et garantir qu'aucune colonne inattendue n'atteigne le LLM.


* **US-2.5 (Tests de Qualité) :** En tant que Data Engineer, je veux coder des tests `dbt` (regex et intégrité référentielle) pour valider la syntaxe des emails/URLs et certifier l'absence d'entités fantômes.


* **US-2.6 (Orchestration Dagster) :** En tant que Data Engineer, je veux développer un graphe Dagster unifiant l'ingestion (`@multi_asset`) et la transformation (`@dbt_assets`) dans un flux d'exécution sécurisé.



## Épique 3 : Moteur IA & Backend MLOps (Assigné : Développeur IA / ML)

* **US-3.1 (Serveur FastAPI & SSE) :** En tant que Développeur IA, je veux initialiser une API FastAPI configurée pour diffuser les réponses du LLM en temps réel via Server-Sent Events (SSE).


* **US-3.2 (Génération d'Embeddings) :** En tant que Développeur IA, je veux utiliser le modèle `intfloat/multilingual-e5-large` pour générer des vecteurs normalisés par lots dans ChromaDB.


* **US-3.3 (Configuration Ollama) :** En tant que Développeur IA, je veux intégrer le modèle local `qwen2.5:3b` avec une température de 0.0 pour un comportement déterministe.


* **US-3.4 (Smart Retrieval RAG) :** En tant que Développeur IA, je veux concevoir un classificateur d'intention pour filtrer sémantiquement la recherche vectorielle, et forcer l'inclusion de documents par correspondance d'identifiants exacts.


* **US-3.5 (Fact-Grounding) :** En tant que Développeur IA, je veux implémenter un algorithme de post-traitement utilisant des expressions régulières pour confronter et corriger automatiquement les emails générés par le LLM par rapport au contexte source.


* **US-3.6 (Détection de Langue & Titrage) :** En tant que Développeur IA, je veux développer un service asynchrone utilisant la librairie `lingua` et le LLM pour générer et traduire des titres de conversation uniques.


* **US-3.7 (Instrumentation OpenTelemetry) :** En tant que Développeur IA, je veux instrumenter le code RAG pour extraire manuellement les spans (génération, post-processing) vers le système de traçage distribué.



## Épique 4 : Interface Web & Expérience Utilisateur (Assigné : Développeur Full-Stack)

* **US-4.1 (Fondations Next.js) :** En tant que Développeur Full-Stack, je veux initialiser l'App Router Next.js avec Tailwind CSS, intégrant un basculement natif Dark/Light mode.


* **US-4.2 (Authentification NextAuth) :** En tant que Développeur Full-Stack, je veux sécuriser l'accès via Google OAuth et accorder un badge spécial aux adresses académiques (`@etu.univh2c.ma`).


* **US-4.3 (Gestion d'État Prisma) :** En tant que Développeur Full-Stack, je veux modéliser le schéma MariaDB via Prisma pour isoler les historiques de conversation, les messages et les paramètres de chaque utilisateur.


* **US-4.4 (Interface Temps Réel) :** En tant que Développeur Full-Stack, je veux consommer le flux SSE du backend pour afficher la frappe de l'IA en direct, avec intégration des boutons Stop, Redo et Edition.


* **US-4.5 (Reconnaissance et Synthèse Vocale) :** En tant que Développeur Full-Stack, je veux utiliser la Web Speech API (STT) et Microsoft Edge Neural Voices (TTS) avec prétraitement phonétique des acronymes et emails.


* **US-4.6 (Moteur de Recherche Plein Texte) :** En tant que Développeur Full-Stack, je veux créer un algorithme de recherche backend scannant titres et messages avec calcul de score et surlignage dynamique dans l'interface.


* **US-4.7 (Signalement & Feedback) :** En tant que Développeur Full-Stack, je veux intégrer des mécanismes de retour (Like/Dislike, Modale de signalement de bugs) pour enrichir la base de données d'évaluation du RAG.



## Épique 5 : Automatisation QA & Tests (Assigné : Automaticien QA / Tests)

* **US-5.1 (Validation du Code CI) :** En tant qu'Automaticien QA, je veux configurer GitHub Actions pour bloquer les pull requests contenant des erreurs de syntaxe Python critiques via `flake8`.


* **US-5.2 (Tests d'Ingestion & Data Contracts) :** En tant qu'Automaticien QA, je veux automatiser l'exécution de `pytest` sur le module DataOps et forcer la vérification des contrats `dbt test` directement sur le runner GitHub.


* **US-5.3 (Validation des Services Web) :** En tant qu'Automaticien QA, je veux valider la logique backend FastAPI avec les métriques activées, et vérifier que le build statique Next.js s'exécute sans erreur.


* **US-5.4 (Tests End-to-End Post-Docker) :** En tant qu'Automaticien QA, je veux déclencher des requêtes HTTP de validation contre la stack conteneurisée active pour certifier que l'API Ollama, FastAPI et DuckDB communiquent correctement en intégration.



## Épique 6 : Conteneurisation & Déploiement Continu (Assigné : Deployment Engineer)

* **US-6.1 (Dockerfiles Multi-Stage) :** En tant que Deployment Engineer, je veux concevoir des images Docker isolées et allégées pour Dagster, le Backend FastAPI (PyTorch CPU-only) et Next.js (environnement non-root).


* **US-6.2 (Orchestration Docker Compose) :** En tant que Deployment Engineer, je veux architecturer le `docker-compose.yml` avec la gestion fine des volumes partagés (DuckDB, ChromaDB) et des ports réseaux.


* **US-6.3 (Séquençage de Démarrage) :** En tant que Deployment Engineer, je veux écrire le script `setup.ps1` gérant l'ordre asynchrone des services locaux (attente du boot Ollama, matérialisation Dagster, lancement de la stack).


* **US-6.4 (Registre Docker Hub) :** En tant que Deployment Engineer, je veux automatiser la compilation (Buildx) et le push sécurisé des images vers Docker Hub via la CI à chaque fusion sur la branche `main`.


* **US-6.5 (Déploiement Automatisé Komodo) :** En tant que Deployment Engineer, je veux configurer l'étape finale du pipeline CI/CD pour invoquer le SDK Komodo et redéployer la stack de production de manière transparente sur le VPS.



## Épique 7 : Observabilité & Monitoring de Production (Assigné : SRE / Ingénieur Monitoring)

* **US-7.1 (Provisionnement de la Stack PLTG) :** En tant que SRE, je veux intégrer et configurer Prometheus, Loki, Tempo et Grafana dans l'écosystème Docker Compose de production.


* **US-7.2 (Infrastructure-as-Code Grafana) :** En tant que SRE, je veux configurer le provisionnement automatique des sources de données et l'importation des tableaux de bord sans interface graphique.


* **US-7.3 (Corrélation Logs & Traces) :** En tant que SRE, je veux collecter les logs des conteneurs via Promtail, ingérer les traces gRPC via Tempo, et activer la fonction `tracesToLogsV2` pour un débogage instantané.


* **US-7.4 (Surveillance Applicative & RAG) :** En tant que SRE, je veux construire des visualisations sur Grafana mesurant le trafic HTTP, la latence des recherches sémantiques, et le décompte des documents extraits.


* **US-7.5 (Métriques LLM MLOps) :** En tant que SRE, je veux isoler la vitesse de génération du modèle (Tokens générés par seconde) pour repérer tout étranglement matériel de l'hôte.


* **US-7.6 (Alerting SLA & Discord) :** En tant que SRE, je veux configurer des règles Alertmanager (erreurs 5xx, indisponibilité Backend, latence critique) connectées nativement au webhook du canal Discord de l'équipe.
