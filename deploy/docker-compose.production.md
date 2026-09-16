# Docker Compose Production

Ce fichier Docker Compose définit les services utilisés pour le déploiement en production du projet **Assistant Conversationnel Universitaire**.

## Services

### MariaDB — `db`

Service de base de données MariaDB.

* Image : `mariadb:lts`
* Conteneur : `assistant_conversationnel_universitaire-mariadb`
* Port : `4806:3306`
* Base de données : `fsbm_assistant`
* Mot de passe root : `root`
* Volume : `assistant_conversationnel_universitaire-mariadb_data`

### Ollama — `ollama`

Service utilisé pour Ollama.

* Image : `ollama/ollama:latest`
* Conteneur : `assistant_conversationnel_universitaire-ollama`
* Port : `4814:11434`
* Volume : `assistant_conversationnel_universitaire-ollama_models`

### Dagster — `dagster`

Service Dagster utilisé dans l'application.

* Image : `${DOCKERHUB_USERNAME}/fsbm-dagster:latest`
* Conteneur : `assistant_conversationnel_universitaire-dagster`
* Port : `4802:3000`
* Volume partagé : `assistant_conversationnel_universitaire-shared_pipeline_data`

### Backend — `backend`

Service backend de l'application.

* Image : `${DOCKERHUB_USERNAME}/fsbm-backend:latest`
* Conteneur : `assistant_conversationnel_universitaire-backend`
* Port : `4801:8000`

Variables d'environnement utilisées :

* `HF_TOKEN`
* `HF_HUB_DISABLE_PROGRESS_BARS`
* `ENABLE_METRICS`
* `PYTHONUNBUFFERED`
* `OLLAMA_BASE_URL`
* `HF_HOME`
* `DUCKDB_PATH`
* `VECTORSTORE_PATH`
* `OTEL_EXPORTER_OTLP_ENDPOINT`
* `OTEL_SERVICE_NAME`

Le backend dépend des services :

* `db`
* `ollama`
* `dagster`

Volumes utilisés :

* cache Hugging Face
* données partagées du pipeline
* cache du vectorstore

### Frontend — `frontend`

Service frontend de l'application.

* Image : `${DOCKERHUB_USERNAME}/fsbm-frontend:latest`
* Conteneur : `assistant_conversationnel_universitaire-frontend`
* Port : `4800:3000`

Variables d'environnement :

* `DATABASE_URL`
* `BACKEND_URL`

Le frontend dépend de :

* `db`
* `backend`

### Prometheus — `prometheus`

Service de monitoring avec Prometheus.

* Image : `prom/prometheus:latest`
* Conteneur : `assistant_conversationnel_universitaire-prometheus`
* Port : `4890:9090`

Fichiers de configuration utilisés :

```text
../monitoring/prometheus.yml
../monitoring/prometheus_rules.yml
```

Volume de données :

```text
assistant_conversationnel_universitaire-prometheus_data
```

Le service dépend du `backend`.

### Grafana — `grafana`

Service Grafana utilisé pour la visualisation du monitoring.

* Image : `grafana/grafana:latest`
* Conteneur : `assistant_conversationnel_universitaire-grafana`
* Port : `4805:3000`
* Mot de passe administrateur : `admin`

Les configurations et dashboards sont montés depuis :

```text
../monitoring/grafana/provisioning/datasources
../monitoring/grafana/provisioning/dashboards
../monitoring/grafana/dashboards
```

Volume de données :

```text
assistant_conversationnel_universitaire-grafana_data
```

Le service dépend de `prometheus`.

### cAdvisor — `cadvisor`

Service cAdvisor.

* Image : `gcr.io/cadvisor/cadvisor:v0.49.1`
* Conteneur : `assistant_conversationnel_universitaire-cadvisor`
* Port : `4880:8080`
* Mode privilégié : activé

Plusieurs répertoires du système hôte sont montés dans le conteneur afin de permettre son fonctionnement.

### Alertmanager — `alertmanager`

Service Alertmanager.

* Image : `prom/alertmanager:latest`
* Conteneur : `assistant_conversationnel_universitaire-alertmanager`
* Port : `4893:9093`

Configuration utilisée :

```text
../monitoring/alertmanager.yml
```

### Loki — `loki`

Service Loki.

* Image : `grafana/loki:latest`
* Conteneur : `assistant_conversationnel_universitaire-loki`
* Port : `4810:3100`

Configuration utilisée :

```text
../monitoring/loki-config.yml
```

Le fichier de configuration est utilisé avec :

```text
-config.file=/etc/loki/local-config.yaml
```

### Promtail — `promtail`

Service Promtail.

* Image : `grafana/promtail:latest`
* Conteneur : `assistant_conversationnel_universitaire-promtail`

Configuration utilisée :

```text
../monitoring/promtail-config.yml
```

Le service dépend de `loki`.

### Tempo — `tempo`

Service Tempo.

* Image : `grafana/tempo:latest`
* Conteneur : `assistant_conversationnel_universitaire-tempo`

Configuration utilisée :

```text
../monitoring/tempo-config.yml
```

Ports exposés :

* `4820:3200`
* `4817:4317`

## Volumes Docker

Le fichier définit les volumes suivants :

```text
assistant_conversationnel_universitaire-mariadb_data
assistant_conversationnel_universitaire-ollama_models
assistant_conversationnel_universitaire-huggingface_cache
assistant_conversationnel_universitaire-shared_pipeline_data
assistant_conversationnel_universitaire-vectorstore_cache
assistant_conversationnel_universitaire-prometheus_data
assistant_conversationnel_universitaire-grafana_data
```

## Ports

| Service      |           Port |
| ------------ | -------------: |
| Frontend     |         `4800` |
| Backend      |         `4801` |
| Dagster      |         `4802` |
| Grafana      |         `4805` |
| MariaDB      |         `4806` |
| Loki         |         `4810` |
| Ollama       |         `4814` |
| Tempo        | `4820`, `4817` |
| cAdvisor     |         `4880` |
| Prometheus   |         `4890` |
| Alertmanager |         `4893` |
