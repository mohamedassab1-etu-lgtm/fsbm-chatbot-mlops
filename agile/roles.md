# Répartition des Rôles et Responsabilités : Assistant Conversationnel FSBM

Ce document détaille l'attribution des rôles au sein de l'équipe pour le projet de l'Assistant Conversationnel FSBM, ainsi que les responsabilités techniques et organisationnelles associées à chaque membre.

## Asmae Benaddi : Facilitateur Agile
**Rôle :** Coordination du projet, maintien du cadre Scrum et gestion de la documentation.
* **Vision et Backlog :** Rédaction de la vision du projet, création et structuration du backlog dans Jira.
* **Animation des Sprints :** Animation des réunions de Sprint Planning, Daily Stand-ups, Sprint Reviews et Rétrospectives.
* **Suivi et Livraison :** Configuration et suivi du tableau Kanban, surveillance de l'avancement de l'équipe.
* **Soutenance :** Coordination de la création des diapositives techniques, organisation des répétitions et gestion du chronométrage pour la présentation finale.

## Wijdane Benkhadir : Data Engineer
**Rôle :** Conception du pipeline DataOps, de l'ingestion brute jusqu'aux données prêtes pour le LLM.
* **Ingestion (EL) :** Configuration des pipelines `dlt` pour extraire les fichiers JSON non structurés et les charger dans DuckDB.
* **Transformation (dbt) :** Développement des modèles de staging pour nettoyer, dénormaliser et restructurer les données (Feature Engineering JSON pour les hiérarchies complexes).
* **Qualité des Données :** Implémentation des Data Contracts (`dbt-expectations`) et des tests d'intégrité (regex, unicité) pour garantir des données sans erreur.
* **Orchestration :** Développement du graphe Dagster liant dynamiquement l'ingestion `dlt` et les transformations `dbt`.

## Mohamed Assab : Scrum Master – Développeur LLM
**Rôle :** Développement du moteur d'Intelligence Artificielle, du backend MLOps et conception de l'architecture RAG.
* **Backend FastAPI :** Création de l'API avec flux SSE (Server-Sent Events) pour le streaming en temps réel.
* **Moteur RAG :** Génération des embeddings (`intfloat/multilingual-e5-large`), gestion de la base vectorielle ChromaDB, et implémentation du Smart Retrieval (classificateur d'intentions et recherches exactes).
* **Intégration LLM :** Configuration et interfaçage avec le modèle local `qwen2.5:3b` via Ollama.
* **Garde-fous (Fact-Grounding) :** Implémentation d'algorithmes de post-traitement par expressions régulières pour corriger les hallucinations (ex: adresses e-mails).
* **Services Annexes :** Mise en place du service asynchrone de titrage et de détection linguistique (`lingua`), et instrumentation du code (OpenTelemetry).

## Jad Mouslim : Product Owner - Développeur Web
**Rôle :** Création de l'interface utilisateur, gestion de l'état client et intégration des services tiers.
* **Frontend Next.js :** Développement de l'interface avec App Router, Tailwind CSS et gestion des thèmes Dark/Light.
* **Authentification et BDD :** Intégration de Google OAuth (NextAuth) avec vérification stricte des emails académiques (`@etu.univh2c.ma`) et modélisation Prisma/MariaDB.
* **Interaction Temps Réel :** Consommation du flux SSE pour l'affichage fluide, avec des fonctionnalités avancées (Stop, Redo, Édition des messages).
* **Multimodalité :** Intégration de la reconnaissance vocale (Web Speech API) et de la synthèse vocale neuronale (Microsoft Edge TTS).
* **Recherche & Feedback :** Développement du moteur de recherche plein texte de l'historique et des modales d'évaluation (Like/Dislike, Signalements).

## Hassan Saissi : Integration Engineer
**Rôle :** Automatisation des tests et garantie de la qualité logicielle en intégration continue (CI).
* **Pipelines GitHub Actions :** Configuration des workflows automatisés se déclenchant lors des push et pull requests.
* **Analyse Statique :** Mise en place du linting bloquant (`flake8`) pour le code Python.
* **Automatisation des Tests :** Exécution continue des tests unitaires DataOps, des tests d'intégrité `dbt test`, et de la validation des composants web Next.js.
* **Tests End-to-End :** Écriture et déclenchement des scripts de validation (requêtes HTTP) sur la stack Docker pour certifier la communication inter-services (FastAPI, Ollama, DuckDB).

## Mohamed Essadik : Deployment Engineer
**Rôle :** Conteneurisation de l'architecture, gestion des environnements et déploiement en production.
* **Conteneurisation :** Création de Dockerfiles multi-stage optimisés pour Dagster, le Backend FastAPI et Next.js (sécurisation non-root).
* **Orchestration Docker Compose :** Gestion complexe des réseaux internes, des volumes partagés (ex: base DuckDB commune à Dagster et FastAPI) et du mapping des ports.
* **Scripts de Démarrage :** Développement de `setup.ps1` pour séquencer le boot asynchrone (attente de la disponibilité d'Ollama, pull du modèle, matérialisation Dagster).
* **Déploiement Continu (CD) :** Automatisation du *build* et *push* des images sur Docker Hub via la CI, et intégration du script SDK Node.js pour le déclenchement automatisé sur le serveur distant (Komodo).

## Zohra Jaraf : Observability Engineer
**Rôle :** Déploiement de la télémétrie, surveillance des performances (MLOps) et gestion des alertes.
* **Stack PLTG :** Intégration et configuration complète de Prometheus, Loki, Tempo et Grafana dans l'écosystème de production.
* **Infrastructure-as-Code :** Provisionnement automatisé des sources de données et des tableaux de bord Grafana.
* **Corrélation et Débogage :** Récupération des logs via Promtail, ingestion des traces gRPC via Tempo et mise en place de la fonction `tracesToLogsV2` pour le débogage RAG.
* **Dashboards MLOps :** Création des visualisations de suivi des latences (P95), du trafic HTTP et des vitesses de génération du modèle IA (Tokens/sec).
* **Alerting :** Paramétrage d'Alertmanager pour détecter les pannes critiques (erreurs 5xx, SLA RAG) et envoi de notifications automatiques vers le Webhook Discord de l'équipe.
