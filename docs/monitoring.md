# Documentation : Pipeline d'Observabilité et de Monitoring MLOps

**Version :** 1.0.0
**Domaine :** Assistant Conversationnel FSBM
**Stack Principal :** Prometheus, Loki, Tempo, Grafana (Stack PLTG), Alertmanager, Promtail, cAdvisor

---

## 1. Vue d'Ensemble du Système

Le pipeline d'observabilité de l'Assistant Conversationnel FSBM offre une visibilité complète sur l'utilisation du matériel, les performances de l'application, les traces distribuées et les vitesses d'inférence du Grand Modèle de Langage (LLM). Il s'appuie sur une architecture de provisionnement automatisée ("as-code") pour déployer instantanément les tableaux de bord, configurer les sources de données et établir des flux d'alertes sans aucune intervention manuelle sur l'interface utilisateur.

---

## 2. Collecte et Stockage des Données de Télémétrie

Le système repose sur une architecture multi-agents pour collecter les différents piliers de l'observabilité (Métriques, Journaux/Logs et Traces).

### 2.1. Métriques (Prometheus & cAdvisor)

* **Architecture de Scraping :** Prometheus est configuré avec un intervalle de récupération (scrape interval) global de 5 secondes, interrogeant agressivement les cibles pour fournir des métriques en temps quasi réel.
* **Métriques Applicatives :** Prometheus interroge le backend FastAPI (`backend:8000`) sur le point de terminaison `/metrics` pour capturer les taux de requêtes HTTP, le nombre de tokens LLM générés et les latences de recherche RAG.
* **Métriques Matérielles et Conteneurs :** Un job dédié cible `cadvisor:8080` pour collecter les statistiques bas niveau des conteneurs Docker (CPU, Mémoire, E/S Réseau).

### 2.2. Agrégation des Journaux (Promtail & Loki)

* **Ingestion des Logs :** Promtail monte le socket Docker de la machine hôte (`/var/run/docker.sock`) pour récupérer en continu la sortie standard (stdout) de tous les conteneurs en cours d'exécution. Il extrait dynamiquement le nom du conteneur via l'étiquette `__meta_docker_container_name` et le standardise sous l'étiquette `container`.
* **Stockage des Logs :** Loki agit comme le système central d'agrégation, recevant les requêtes "push" de Promtail sur le port 3100. Il est configuré pour utiliser un schéma de base de données de séries chronologiques (TSDB) pour une indexation efficace, avec les blocs (chunks) et les règles stockés directement sur le système de fichiers local (`/tmp/loki`).

### 2.3. Traçage Distribué (Tempo)

* **Réception des Traces :** Grafana Tempo est déployé pour ingérer les traces distribuées via le protocole OpenTelemetry (OTLP). Il écoute les données de télémétrie entrantes via gRPC sur le port 4317 (`0.0.0.0:4317`).
* **Stockage :** Les traces et les journaux de transaction (WAL) sont persistés localement dans le répertoire `/tmp/tempo`.

---

## 3. Provisionnement Automatisé et Corrélation

Pour garantir que la stack de monitoring soit immédiatement opérationnelle lors du déploiement, Grafana est configuré avec des fichiers de provisionnement automatisés.

* **Sources de Données (`datasources.yml`) :** Prometheus est défini comme la source de données par défaut, tandis que Loki et Tempo sont enregistrés simultanément.
* **Corrélation Traces-Logs :** La source de données Tempo est configurée avec une intégration native `tracesToLogsV2`. Lorsqu'un opérateur clique sur un ID de trace, Grafana exécute automatiquement une requête personnalisée (`{container="fsbm-backend"} |= "${__trace.traceId}"`) dans Loki pour faire remonter instantanément les journaux exacts du backend associés à cette requête HTTP spécifique.
* **Provisionnement des Tableaux de Bord (`default.yml`) :** Grafana a pour instruction de charger et mettre à jour automatiquement les tableaux de bord depuis le répertoire `/etc/grafana/dashboards`, en vérifiant les modifications toutes les 10 secondes.

---

## 4. Alertes et Gestion des Incidents

La surveillance proactive du système est gérée par une combinaison de règles d'évaluation Prometheus et de routage Alertmanager.

### 4.1. Règles d'Alerte (`prometheus_rules.yml`)

Trois alertes principales sont configurées pour protéger les accords de niveau de service (SLA) du chatbot de la FSBM :

1. **BackendDown (Critique) :** Se déclenche si le conteneur `fastapi-backend` ne répond plus aux vérifications de santé de Prometheus pendant 1 minute continue.
2. **HighErrorRate (Critique) :** Se déclenche si plus de 5 % de toutes les requêtes HTTP se soldent par des erreurs serveur (5xx) sur une fenêtre glissante de 5 minutes.
3. **HighRAGLatency (Avertissement) :** Une alerte spécifique au MLOps qui se déclenche si la latence du 95e centile (P95) de la recherche vectorielle pour une intention spécifique dépasse 8 secondes sur une période de 2 minutes.

### 4.2. Routage et Intégration Discord (`alertmanager.yml`)

* **Logique de Routage :** Alertmanager regroupe les alertes entrantes par `alertname` (nom de l'alerte) et `severity` (gravité), en attendant 10 secondes pour regrouper les alertes associées avant de les déclencher. Les notifications répétées pour des incidents en cours sont bloquées pendant 1 heure.
* **Intégration Discord :** Les alertes sont transmises directement à un webhook Discord dédié.
* **Serveur Discord :** L'alerte est envoyée sur le serveur **FSBM Assistant**.
* **Canal :** Elle est publiée dans le canal **monitoring-alerts**.
* **Nom du Bot (Affichage) :** Le message apparaît comme étant envoyé par **Prometheus**.
* **Format du Message :** Le corps du message est fortement personnalisé pour afficher le statut de l'alerte (En cours / Résolu), la gravité, le service concerné, et des messages d'erreur ou de résolution spécifiques.

---

## 5. Tableaux de Bord Grafana

La couche de visualisation se compose de trois tableaux de bord distincts, chacun répondant à un besoin opérationnel spécifique.

### 5.1. Cadvisor Exporter (Infrastructure)

Ce tableau de bord fournit une vue de bas niveau sur la machine hôte et les conteneurs Docker.

* **Utilisation des Ressources :** Des graphiques temporels suivent l'utilisation du processeur (en pourcentage) et l'utilisation de la mémoire (octets mis en cache et RSS) pour chaque conteneur.
* **E/S Réseau :** Suit le trafic réseau reçu et envoyé en octets par seconde (Bps).
* **Cycle de Vie des Conteneurs :** Un panneau tabulaire "Containers Info" calcule le temps de fonctionnement des conteneurs et extrait les étiquettes Docker Compose (ex. : projet, répertoire de travail, nom du service et image du registre).

### 5.2. FSBM Assistant Observability (Application & Logs)

Ce tableau de bord est le principal outil pour surveiller les performances et déboguer le backend.

* **Performances RAG :** Visualise le nombre total de requêtes regroupées par intention de l'utilisateur via un diagramme circulaire, suit la latence de récupération P95 au fil du temps, et utilise une jauge pour afficher le nombre moyen de documents de contexte récupérés par requête.
* **Trafic :** Surveille les requêtes HTTP entrantes par seconde.
* **Logs et Traces Intégrés :** Comprend des flux de logs Loki en direct pour les conteneurs `fsbm-backend` et `fsbm-frontend`, ainsi qu'un panneau de recherche de traces Tempo spécialement filtré pour le service `fsbm-fastapi-backend`.

### 5.3. FSBM MLOps & LLM Performance (Moteur IA)

Ce tableau de bord spécialisé isole les performances du Grand Modèle de Langage (LLM).

* **Vitesse d'Inférence :** Un graphique temporel interroge `rate(llm_tokens_generated_total[1m])` pour suivre la vitesse de génération exacte (Tokens/sec) des modèles Ollama locaux (ex. : `qwen2.5:3b`). Cela permet aux ingénieurs d'identifier immédiatement tout étranglement thermique ou toute dégradation matérielle impactant les vitesses de génération de l'IA.