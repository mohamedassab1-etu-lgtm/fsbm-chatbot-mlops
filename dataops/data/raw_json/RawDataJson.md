# 🎓 DataOps — Données de la Faculté des Sciences Ben M'Sik

## 📌 Présentation

Ce projet a pour objectif de centraliser et structurer des données relatives à la **Faculté des Sciences Ben M'Sik (FSBM)** de l'**Université Hassan II de Casablanca**.

Les données sont stockées au format **JSON** et regroupent différentes informations académiques et administratives concernant la faculté.

Le projet constitue une base de données structurée pouvant être utilisée dans le cadre d'un projet **DataOps**, d'une application web, d'un assistant conversationnel ou de systèmes d'analyse et de recherche d'informations.

---

## 🏫 Établissement

**Faculté des Sciences Ben M'Sik (FSBM)**
**Université Hassan II de Casablanca**

Les données couvrent notamment les différents départements de la faculté, leurs formations, les enseignants, les laboratoires ainsi que les emplois du temps.

---

## 📂 Structure du projet

```text
dataops/
│
└── data/
    └── raw_json/
        ├── departements.json
        ├── emplois.json
        ├── formations.json
        ├── laboratoires.json
        └── professeurs.json
```

Les fichiers JSON constituent la source de données brutes du projet.

---

## 📊 Données disponibles

### 🏛️ Départements

Le fichier `departements.json` contient les informations relatives aux départements de la faculté.

Pour chaque département, on retrouve notamment :

* Nom du département
* Description
* Chef de département
* Licences
* Masters
* Responsables des formations

Les départements présents dans les données comprennent notamment :

* Biologie
* Chimie
* Géologie
* Mathématiques et informatique
* Physique
* Sciences de la communication et Humanités

Par exemple, le département de Mathématiques et Informatique contient des formations en statistiques, analyses mathématiques, cybersécurité, développement Full Stack, administration réseaux et systèmes et développement informatique.

---

### 🕐 Emplois du temps

Le fichier `emplois.json` contient les emplois du temps des différentes sections.

Chaque emploi du temps est organisé selon :

* La section
* Le jour
* L'horaire
* Le type de séance
* Le module
* Le groupe
* La salle

Les types de séances comprennent notamment :

* `COURS`
* `TD`

Exemple de structure :

```json
{
    "section": "Tronc Commun Physique Chimie (PC)/S1 - PC1",
    "emploi_du_temps": {
        "LU": {
            "8H30 / 10H": [
                {
                    "type": "COURS",
                    "module": "THERMODYNAMIQUE",
                    "salle": "A7"
                }
            ]
        }
    }
}
```

Les données contiennent également des informations pour plusieurs sections, notamment PC1, PC2, PC3, BG1, BG2 et BG3.

---

### 🎓 Formations

Le fichier `formations.json` contient les différentes formations proposées par la faculté.

Les formations sont notamment organisées par type, comme :

* Licence Fondamentale
* Master
* Autres formations selon les données disponibles

Chaque entrée permet de structurer les informations relatives aux formations académiques.

---

### 🔬 Laboratoires

Le fichier `laboratoires.json` regroupe les informations concernant les laboratoires de recherche de la faculté.

Il permet notamment d'associer les laboratoires à leurs départements et de centraliser leurs informations.

---

### 👨‍🏫 Professeurs

Le fichier `professeurs.json` contient les informations relatives aux enseignants de la faculté.

Il permet de centraliser les données des professeurs et de les exploiter dans les applications utilisant cette base de données.

---

## 🧩 Organisation des données

Les données sont séparées par domaine afin de faciliter leur :

* gestion ;
* modification ;
* exploitation ;
* transformation ;
* intégration dans d'autres systèmes.

```text
                     ┌──────────────────────┐
                     │       FSBM           │
                     └──────────┬───────────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
      Départements         Formations        Professeurs
             │                  │                  │
             └──────────────────┼──────────────────┘
                                │
             ┌──────────────────┴──────────────────┐
             │                                     │
             ▼                                     ▼
       Laboratoires                         Emplois du temps
```

---

## 🛠️ Technologies

Les données de ce projet sont actuellement stockées sous forme de fichiers :

* **JSON**
* Structure de données hiérarchique
* Organisation par domaine fonctionnel

Le projet peut ensuite être intégré à différents outils ou technologies de traitement de données.

---

## 🚀 Utilisation

### 1. Cloner le projet

```bash
git clone <URL_DU_REPOSITORY>
```

### 2. Accéder au dossier

```bash
cd dataops
```

### 3. Consulter les données

Les données brutes sont disponibles dans :

```text
data/raw_json/
```

Par exemple :

```bash
cat data/raw_json/departements.json
```

ou :

```bash
cat data/raw_json/professeurs.json
```

---

## 🎯 Objectifs du projet

Ce jeu de données peut servir de base pour :

* développer une application d'information universitaire ;
* rechercher des formations ;
* consulter les informations des départements ;
* rechercher des enseignants ;
* consulter les laboratoires ;
* rechercher des emplois du temps ;
* alimenter un assistant conversationnel spécialisé pour la FSBM ;
* mettre en place des pipelines de traitement et de transformation de données.

---

## 📁 Données brutes

Les données utilisées dans ce projet sont organisées dans le répertoire :

```text
data/raw_json/
```

avec les cinq sources principales :

| Fichier             | Contenu                                |
| ------------------- | -------------------------------------- |
| `departements.json` | Départements et informations associées |
| `emplois.json`      | Emplois du temps                       |
| `formations.json`   | Formations universitaires              |
| `laboratoires.json` | Laboratoires de recherche              |
| `professeurs.json`  | Informations sur les professeurs       |

---

## 🔄 Évolution du projet

Le projet peut évoluer progressivement vers une architecture DataOps complète comprenant :

```text
Données brutes
      ↓
Validation
      ↓
Nettoyage
      ↓
Transformation
      ↓
Stockage
      ↓
API / Application
      ↓
Exploitation des données
```

Des étapes supplémentaires peuvent être ajoutées, telles que la validation automatique des fichiers JSON, le contrôle de qualité des données, la génération de données transformées et l'automatisation des pipelines.

---

## 👥 Projet

Projet académique autour de la gestion et de l'exploitation des données de la **Faculté des Sciences Ben M'Sik**.

---

## 📄 Licence

Ce projet est destiné à un usage académique et pédagogique.
