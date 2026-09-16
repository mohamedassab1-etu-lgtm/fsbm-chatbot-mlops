# 🚀 Documentation de Déploiement Komodo - FSBM Chatbot MLOps

Ce document détaille la configuration et l'architecture de déploiement automatique via **Komodo Deployment Engine** pour le projet **Assistant Conversationnel Universitaire (FSBM Chatbot MLOps)**.

---

## 📌 Vue d'ensemble

Le déploiement continu de ce projet s'appuie sur la stack Komodo configurée dans le fichier `komodo/resources.toml`. Komodo surveille le dépôt GitHub et applique les mises à jour automatiques des services définis dans la configuration Docker Compose de production.

* **Nom du Projet** : Assistant Conversationnel Universitaire
* **Dépôt GitHub** : [`mohamedassab1-etu-lgtm/fsbm-chatbot-mlops`](https://github.com/mohamedassab1-etu-lgtm/fsbm-chatbot-mlops)
* **Serveur Cible** : `vh3`
* **Stratégie de Mises à Jour** : Automatique sur détection de changements (`auto_update = true`)

---

## ⚙️ Fichier de Configuration (`komodo/resources.toml`)

```toml
[[stack]]
name = "assistant_conversationnel_universitaire"

[stack.config]
server = "vh3"
project_name = "assistant_conversationnel_universitaire"
auto_update = true
auto_update_all_services = true
repo = "mohamedassab1-etu-lgtm/fsbm-chatbot-mlops"
reclone = false
file_paths = [
  "deploy/docker-compose.production.yml"
]
environment = """
DOCKERHUB_USERNAME=mohamedassab
HF_TOKEN=${KOMODO_SECRET_HF_TOKEN}
"""