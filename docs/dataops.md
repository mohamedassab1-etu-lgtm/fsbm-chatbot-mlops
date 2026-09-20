# Documentation: Architecture et Pipeline DataOps (Assistant Conversationnel FSBM)

**Version:** 1.0.0
**Projet:** Chatbot MLOps - Faculté des Sciences Ben M'Sik (FSBM)
**Auteur:** Équipe DataOps / Déploiement

---

## 1. Vue d'Ensemble du Projet

Le pipeline DataOps de l'Assistant Conversationnel FSBM a été conçu pour ingérer, transformer, valider et orchestrer les données académiques et administratives de l'université. L'objectif principal de cette architecture est de fournir une base de connaissances (Vector Store / RAG) **parfaitement structurée et sans hallucination** pour le modèle de langage (LLM).

Ce pipeline garantit que toutes les données exposées au chatbot respectent des règles métier strictes, des contraintes d'intégrité référentielle et un formatage standardisé.

---

## 2. Stack Technologique (Architecture MLOps)

L'architecture repose sur une pile moderne de données (Modern Data Stack) conteneurisée via Docker et déployée sur un serveur Komodo.

* **Extraction et Chargement (EL) :** `dlt` (Data Load Tool)
* **Base de Données / Data Warehouse :** `DuckDB`
* **Transformation et Tests (T) :** `dbt` (Data Build Tool) + `dbt-expectations`
* **Orchestration :** `Dagster`
* **Déploiement :** Docker Compose (Environnement de production géré par Komodo)

---

## 3. Modélisation des Données (Data Domain)

Le pipeline traite 6 entités principales issues de fichiers JSON bruts, qui représentent la structure complète de la FSBM :

1. **Faculté :** Informations générales, direction, contacts, géolocalisation.
2. **Départements :** Départements académiques et leurs chefs.
3. **Formations :** Hiérarchie des cycles (Licences, Masters, Doctorats), modules et axes de recherche.
4. **Professeurs :** Répertoire du corps professoral, statuts, départements d'attache et contacts.
5. **Laboratoires :** Structures de recherche, directeurs, et équipes de chercheurs.
6. **Emplois du Temps :** Plannings hebdomadaires ultra-détaillés par section, jour, et créneau horaire.

---

## 4. Étapes du Pipeline DataOps

### Étape 1 : Ingestion des Données (Script `ingest_dlt.py`)

L'outil `dlt` est utilisé pour lire les fichiers JSON bruts et les charger dynamiquement dans DuckDB.

* **Aplatissement (Flattening) :** Le script gère la complexité des JSON imbriqués. Par exemple, pour les emplois du temps, il transforme l'arborescence (Jour -> Heure -> Cours) en colonnes SQL plates (ex: `emploi_du_temps__lu___8_h30_10_h`) contenant des chaînes JSON, évitant ainsi la création de sous-tables inutiles par `dlt`.
* **Ressources :** Chaque fichier JSON correspond à une ressource `dlt` décorée par `@dlt.resource`, avec la disposition `write_disposition="replace"` pour garantir une base fraîche à chaque exécution.

### Étape 2 : Transformation (Projet `dbt : fsbm_transform`)

Une fois les données brutes dans le schéma `raw_data` de DuckDB, `dbt` prend le relais pour nettoyer, restructurer et typer les données dans le schéma `clean_data` via les modèles `stg_*.sql`.

* **Casting JSON :** Utilisation intensive de la fonction `CAST(... AS JSON)` ou `CAST(... AS VARCHAR)` de DuckDB pour recréer des objets JSON propres et interrogeables par l'application frontend.
* **Agrégation (GROUP BY) :** Reconstruction des relations (ex: regrouper les listes d'emails par professeur, ou les listes d'équipes par laboratoire) en utilisant des jointures et la fonction `list()`.

### Étape 3 : Assurance Qualité et Contrat de Données (Tests dbt)

C'est le cœur du pipeline DataOps. Plus de 20 tests automatisés garantissent la fiabilité des données en 5 phases :

1. **Validation Stricte du Schéma :** Utilisation du package `dbt-expectations` pour verrouiller les colonnes de chaque table. Aucune colonne manquante ou supplémentaire n'est tolérée.
2. **Intégrité Universelle :** Tests génériques YAML (`not_null`, `unique`) sur les clés primaires (ex: `nom_professeur`, `section`).
3. **Intégrité Référentielle (Tests SQL Singuliers) :** Vérification croisée entre les tables (ex: un coordonnateur de formation DOIT exister dans la table des professeurs ; un département assigné à un professeur DOIT exister dans la table des départements).
4. **Validation Syntaxique (Regex) :** Vérification par expressions régulières du format des emails (`*@*.*`), des URLs (`http://`) et des numéros de téléphone marocains (`+212...`).
5. **Logique Métier Complexe :** Contrôle des anomalies spécifiques au domaine universitaire (ex: exclusion stricte des emplois du temps "Template Vide", vérification qu'un directeur de laboratoire n'est pas son propre adjoint, application stricte des règles de cycles académiques).

### Étape 4 : Orchestration (Script `orchestration.py`)

`Dagster` orchestre l'ensemble du flux de manière déclarative en connectant les dépendances entre `dlt` et `dbt`.

* **Actif dlt (`@multi_asset`) :** Dagster exécute l'ingestion et déclare dynamiquement les 16 tables brutes générées.
* **Actif dbt (`@dbt_assets`) :** Dagster lit le `manifest.json` de dbt, comprend que dbt dépend des tables brutes de dlt, et lance la commande `dbt build` (qui exécute les transformations ET les tests).
* **Graphe d'exécution :** Si `dlt` échoue, `dbt` ne se lance pas. Si un test `dbt` échoue (violation du contrat de données), le pipeline s'arrête en erreur, protégeant ainsi l'application LLM.

---

## 5. Déploiement et Résolution des Conflits (Production)

Le pipeline est déployé sur un environnement Docker via Komodo. Une architecture spécifique a été mise en place pour gérer les limitations de concurrence de la base de données DuckDB/SQLite :

* **Le problème du Daemon :** Exécuter la commande par défaut `dagster dev` lance des daemons d'arrière-plan qui verrouillent la base de données, causant des erreurs `database is locked` lors des requêtes dbt.
* **La solution Webserver :** Le service Docker de Dagster est configuré pour lancer uniquement l'interface UI via la commande : `["dagster-webserver", "-h", "0.0.0.0", "-p", "3000", "-f", "orchestration.py"]`. Cela permet une orchestration fluide sans verrouillage de la base de données.

---

## 6. Conclusion

Ce pipeline DataOps représente l'état de l'art en matière de préparation de données pour l'intelligence artificielle. En dissociant l'extraction (dlt), la transformation logique (dbt), et en verrouillant le tout par un contrat de données strict orchestré par Dagster, l'application RAG (Retrieval-Augmented Generation) du chatbot FSBM est immunisée contre les données erronées, les doublons, et les asymétries de schéma.