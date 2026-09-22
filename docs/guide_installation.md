# Guide d'Installation et de Déploiement : Assistant Conversationnel FSBM

Ce document détaille la procédure complète pour initialiser, compiler et déployer l'architecture microservices de l'Assistant Conversationnel FSBM. L'environnement repose sur une conteneurisation intégrale via Docker, garantissant une reproductibilité parfaite entre le développement local et la production.

## 1. Prérequis Système

Avant de commencer, assurez-vous que la machine hôte (serveur VPS ou poste de développement) dispose des éléments suivants :

* **Moteur de conteneurisation :** Docker et Docker Compose installés et à jour.


* **Ressources matérielles (Recommandées) :** Minimum 16 Go de RAM. Si la RAM est limitée, il est impératif d'allouer au moins 10 Go d'espace Swap pour éviter les erreurs "Out of Memory" (OOM) lors du chargement du modèle d'Intelligence Artificielle.


* **Accès réseau :** Les ports 3000 (Frontend), 8000 (Backend), 3001 (Dagster), 3005 (Grafana) et 11434 (Ollama) doivent être libres en local.



## 2. Configuration des Variables d'Environnement

Clonez le dépôt source. À la racine du projet, vous devez configurer les variables d'environnement de sécurité.

Créez un fichier `website/.env.local` contenant les identifiants OAuth Google et la clé de session Next.js :

```env
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
NEXTAUTH_SECRET=votre_cle_secrete_aleatoire
NEXTAUTH_URL=http://localhost:3000
BACKEND_URL=http://backend:8000

```

Créez un fichier `website/.env` pour la chaîne de connexion à la base de données relationnelle :

```env
DATABASE_URL=mysql://root:root@db:3306/fsbm_assistant

```

Pour le backend (dans un fichier `.env` racine ou exporté dans le terminal), configurez le token Hugging Face nécessaire au téléchargement du modèle d'embedding :

```env
HF_TOKEN=votre_token_hugging_face

```

## 3. Séquence de Lancement (Environnement Local)

Le démarrage des services doit suivre un ordre précis en raison des dépendances de données (le backend a besoin que Dagster ait terminé de construire la base DuckDB). Cette logique est encapsulée dans la logique d'intégration continue et du script `setup.ps1`.

**Étape 3.1 : Compilation et bases de données**
Reconstruisez les images sans utiliser le cache pour garantir un état propre, puis lancez MariaDB et Ollama :

```bash
docker compose build
docker compose up -d db ollama

```

**Étape 3.2 : Amorçage du LLM**
Attendez que l'API Ollama soit disponible (environ 10 secondes), puis tirez le modèle `qwen2.5:3b` qui servira de moteur RAG :

```bash
docker exec fsbm-ollama ollama pull qwen2.5:3b

```

**Étape 3.3 : Lancement de l'Orchestrateur et du Frontend**
Démarrez Dagster et l'interface utilisateur.

```bash
docker compose up -d frontend dagster

```

**Étape 3.4 : Matérialisation des Données (DataOps)**
Forcez Dagster à exécuter le pipeline d'ingestion `dlt` et les transformations `dbt` pour générer le fichier `fsbm.duckdb` final. Cette commande synchronise le terminal avec les logs de Dagster :

```bash
docker exec fsbm-dagster mkdir -p /app/data/duckdb
docker exec fsbm-dagster dagster asset materialize -f orchestration.py --select '*'

```

**Étape 3.5 : Lancement du Backend et de l'Observabilité**
Une fois la matérialisation terminée avec succès, démarrez le reste de l'infrastructure (FastAPI, ChromaDB, Prometheus, Grafana, Loki, etc.).

```bash
docker compose up -d

```

Vous pouvez suivre l'initialisation du moteur RAG (chargement des embeddings en mémoire) avec `docker logs -f fsbm-backend`. Le système est prêt lorsque le message *"Chat engine successfully loaded and ready"* apparaît.

## 4. Déploiement en Production (Komodo)

Pour l'environnement de production, le fichier `docker-compose.production.yml` est utilisé.

* Les images ne sont pas *buildées* sur le serveur, elles sont téléchargées depuis Docker Hub (ex: `${DOCKERHUB_USERNAME}/fsbm-backend:latest`).


* Les ports sont remappés pour éviter les conflits (ex: le frontend écoute sur `4800` au lieu de `3000`).


* Dagster est démarré avec la commande explicite `dagster-webserver` pour éviter les erreurs de verrouillage de base de données DuckDB (`database is locked`) causées par les daemons d'arrière-plan.


* Le déploiement est entièrement automatisé par GitHub Actions via le SDK Node.js `komodo_client`, qui déclenche la mise à jour de la stack `assistant_conversationnel_universitaire` sur le serveur cible.



---
