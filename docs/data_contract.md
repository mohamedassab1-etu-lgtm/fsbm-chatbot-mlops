# Contrat de Données : Framework DataOps de l'Assistant Conversationnel FSBM

**Version :** 1.0.0
**Domaine :** Données Académiques et Administratives de la Faculté des Sciences Ben M'Sik (FSBM)
**Infrastructure Cible :** DuckDB (Destination) / dbt (Transformation et Tests) / Dagster (Orchestration)
**Consommateur :** Chatbot IA FSBM (Contexte LLM et Pipeline RAG)

---

## 1. Objectif et Portée

Ce contrat de données définit les normes strictes de qualité, de structure et de référentiel requises pour le data warehouse de la FSBM. Le consommateur final étant un Grand Modèle de Langage (LLM), la qualité des données est d'une importance critique. Toute donnée orpheline, logique dupliquée ou syntaxe malformée entraînera des hallucinations de l'IA.

Ce document garantit que toutes les données matérialisées dans le schéma `clean_data` répondent aux spécifications exactes requises pour une récupération de contexte LLM sûre, précise et fiable.

---

## 2. Définitions Exactes du Schéma

Afin de prévenir la dérive du schéma (schema drift) et l'ingestion de données non autorisées, chaque table matérialisée DOIT correspondre strictement aux configurations de colonnes suivantes. Ceci est appliqué de manière programmatique via le package `dbt-expectations` (`expect_table_columns_to_match_set`). Aucune colonne supplémentaire n'est autorisée ; aucune colonne définie ne peut être omise.

### 2.1. `stg_departements`

| Nom de la Colonne | Description |
| --- | --- |
| `nom_departement` | Le nom officiel et complet du département. |
| `chef` | Le nom du chef de département (Responsable académique). |
| `description_dept` | Description détaillée des missions et axes de recherche. |

### 2.2. `stg_emplois`

| Nom de la Colonne | Description |
| --- | --- |
| `section` | Nom de la section ou du groupe d'étudiants (ex: Tronc Commun PC1). |
| `planning_json` | Planning hebdomadaire au format JSON structuré. |

### 2.3. `stg_faculte`

| Nom de la Colonne | Description |
| --- | --- |
| `nom_officiel` | Nom complet de l'établissement. |
| `acronyme` | Acronyme officiel (FSBM). |
| `universite_de_rattachement` | Université mère (UH2C). |
| `annee_de_creation` | Année de fondation. |
| `doyen` | Nom du Doyen en exercice. |
| `vice_doyen` | Nom du Vice-Doyen en exercice. |
| `description` | Présentation générale de l'établissement. |
| `adresse` | Adresse physique complète. |
| `fax` | Numéro de fax officiel. |
| `site_web` | URL du portail web. |
| `emails_json` | Objet JSON des emails de contact (principal, scolarité, IA). |
| `localisation_json` | Objet JSON de géolocalisation (ville, pays, région, quartier). |
| `telephones_json` | Liste JSON des numéros de téléphone standards. |
| `departements_inclus_json` | Liste JSON des noms des départements de la faculté. |

### 2.4. `stg_formations`

| Nom de la Colonne | Description |
| --- | --- |
| `cycle` | Cycle d'études (Licence Fondamentale, Master, Doctorat). |
| `nom_departement` | Département de rattachement. |
| `nom_filiere` | Intitulé officiel de la formation. |
| `coordonnateur` | Nom du professeur responsable. |
| `specialite` | Spécialité disciplinaire de la filière. |
| `objectifs` | Objectifs pédagogiques. |
| `debouches` | Perspectives professionnelles et académiques. |
| `cible` | Profils d'étudiants admis. |
| `domaine` | Domaine de recherche (Spécifique Doctorat). |
| `description` | Description globale (Spécifique Doctorat). |
| `modules_json` | Structure JSON des semestres et modules (Spécifique Licence/Master). |
| `axes_recherche_json` | Liste JSON des axes de recherche (Spécifique Doctorat). |

### 2.5. `stg_laboratoires`

| Nom de la Colonne | Description |
| --- | --- |
| `nom_laboratoire` | Nom officiel du laboratoire. |
| `acronyme` | Abréviation du laboratoire. |
| `description` | Thématique générale de recherche. |
| `directeur` | Professeur à la tête du laboratoire. |
| `directeur_adjoint` | Professeur assistant à la direction. |
| `equipes_json` | Structure JSON des équipes et de leurs membres. |

### 2.6. `stg_professeurs`

| Nom de la Colonne | Description |
| --- | --- |
| `nom_professeur` | Nom et prénom du professeur. |
| `statut` | Grade académique ou fonction de recherche. |
| `linkedin_url` | Lien vers le profil professionnel LinkedIn. |
| `emails_json` | Liste JSON des adresses emails professionnelles. |
| `scopus_profile_url` | Lien vers le profil académique Scopus. |
| `biographie` | Présentation du parcours et des travaux. |
| `nom_departement` | Département de rattachement du professeur. |

---

## 3. Intégrité Universelle des Données

Pour s'assurer que le vector store achemine correctement l'information, des règles d'identité fondamentales DOIVENT être respectées.

* **Non-Nullité et Unicité des Clés Primaires :**
* `stg_departements.nom_departement` DOIT ÊTRE unique et non nul.
* `stg_emplois.section` DOIT ÊTRE unique et non nul.
* `stg_faculte.nom_officiel` DOIT ÊTRE unique et non nul.
* `stg_laboratoires.nom_laboratoire` DOIT ÊTRE unique et non nul.
* `stg_laboratoires.acronyme` DOIT ÊTRE unique.
* `stg_professeurs.nom_professeur` DOIT ÊTRE unique et non nul.

---

## 4. Intégrité Référentielle Stricte

La fenêtre de contexte du LLM ne doit jamais être polluée par des entités "fantômes". Toutes les relations DOIVENT correspondre à des clés primaires vérifiées.

* **Lien Professeur-Département :** Si `stg_professeurs.nom_departement` est renseigné (non nul), la chaîne exacte DOIT exister dans `stg_departements.nom_departement`. Les correspondances "Introuvable" ou orphelines sont strictement interdites.
* **Lien Formation-Département :** Chaque `nom_departement` défini dans `stg_formations` DOIT exister dans `stg_departements.nom_departement`.
* **Lien Faculté-Département :** Chaque élément (chaîne de caractères) du tableau `stg_faculte.departements_inclus_json` DOIT exister dans `stg_departements.nom_departement`.
* **Vérification de la Direction (Leadership) :** Tout individu désigné comme responsable DOIT exister dans `stg_professeurs.nom_professeur`. Cela s'applique strictement à :
* `stg_departements.chef`
* `stg_formations.coordonnateur`
* `stg_laboratoires.directeur`

---

## 5. Validation de la Syntaxe et du Format

Les résultats présentés aux utilisateurs (liens, e-mails, numéros de téléphone) fournis par le chatbot DOIVENT être entièrement fonctionnels et syntaxiquement corrects.

* **Formatage des E-mails :** Toute chaîne non vide extraite de `stg_professeurs.emails_json` ou `stg_faculte.emails_json` DOIT passer la validation regex standard des e-mails (`^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`).
* **Formatage des URL :** Les colonnes `linkedin_url` et `scopus_profile_url` (dans `stg_professeurs`), ainsi que `site_web` (dans `stg_faculte`), DOIVENT commencer par un protocole web valide (`http://`, `https://`, ou `www.`).
* **Formatage des Téléphones :** Les numéros de téléphone et de fax dans `stg_faculte` DOIVENT respecter la structure de numérotation marocaine (`+212` ou `0`, suivi de `5`, `6` ou `7`, puis exactement 8 chiffres) après suppression des espaces.

---

## 6. Logique Métier et Cohérence JSON

Les données non structurées profondément imbriquées DOIVENT se conformer aux règles opérationnelles spécifiques de la FSBM.

### 6.1. Cycles Académiques (`stg_formations`)

* **Cycles Valides :** La colonne `cycle` DOIT contenir uniquement l'une des trois chaînes exactes : `Licence Fondamentale`, `Master`, ou `Doctorat`.
* **Application du Schéma Doctorat :** Si `cycle = 'Doctorat'`, le tableau `axes_recherche_json` DOIT être renseigné, et `modules_json` DOIT ÊTRE nul ou explicitement vide (`[]` ou `[{}]`).
* **Application du Schéma Licence/Master :** Si `cycle IN ('Licence Fondamentale', 'Master')`, l'objet `modules_json` DOIT être renseigné, et `axes_recherche_json` DOIT ÊTRE nul ou vide.

### 6.2. Emplois du Temps Universitaires (`stg_emplois`)

* **Exclusion des Modèles (Templates) :** Aucune ligne dont la `section` contient les sous-chaînes "Template" ou "Vide" (insensible à la casse) ne peut être matérialisée dans le data warehouse.
* **Activités Valides :** Chaque objet parsé dans les créneaux horaires de `planning_json` DOIT posséder un attribut `type` strictement limité à : `COURS`, `TD`, `TP`, ou `AUTRE`.

### 6.3. Laboratoires de Recherche (`stg_laboratoires`)

* **Séparation de la Direction :** La chaîne exacte de la colonne `directeur` NE DOIT PAS être égale à la chaîne de la colonne `directeur_adjoint`.
* **Exigence d'Équipe :** Le tableau `equipes_json` NE DOIT PAS être vide. Un laboratoire doit contenir au moins une équipe de recherche valide.

### 6.4. Redondance des Contacts (`stg_professeurs`)

* **Dédoublonnage Interne des Tableaux :** Le tableau `emails_json` d'un même professeur NE DOIT PAS contenir de chaînes d'e-mails en double.
* **Dédoublonnage Global des E-mails :** Deux professeurs distincts ne peuvent pas revendiquer la même adresse e-mail exacte dans la base de données.

---

## 7. Application CI/CD et SLA

Ce contrat de données est appliqué de manière programmatique via **dbt Core**.

* **Exécution :** Le contrat est évalué à chaque exécution du pipeline orchestrée par Dagster.
* **Protocole d'Échec :** Une violation de N'IMPORTE QUELLE clause de ce contrat (qu'il s'agisse d'un test générique YAML, d'un verrouillage de schéma `dbt-expectations`, ou d'une requête SQL singulière personnalisée) déclenchera immédiatement un état d'échec (`FAILED`) dans le pipeline de déploiement de Dagster.
* **Isolation des Données :** Les transformations échouées bloqueront la promotion du schéma `clean_data`, garantissant que le vector store du LLM en aval ne soit jamais exposé à des données non conformes.