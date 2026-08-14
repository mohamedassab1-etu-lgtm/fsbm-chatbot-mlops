import duckdb
from langchain_core.documents import Document

def load_data_as_documents():
    con = duckdb.connect('../data/duckdb/fsbm.duckdb') # Assure-toi que le chemin est correct selon l'emplacement du script
    documents = []

    # 1. Formations
    formations = con.execute("SELECT * FROM clean_data.stg_formations").fetchall()
    for f in formations:
        # Nouveau mappage précis selon stg_formations.yml :
        # f[0]: cycle
        # f[1]: nom_departement
        # f[2]: nom_filiere
        # f[3]: coordonnateur
        # f[4]: specialite
        # f[5]: objectifs
        # f[6]: debouches
        # f[7]: cible
        # f[8]: domaine (Doctorat)
        # f[9]: description (Doctorat)
        # f[10]: modules_json (Licence/Master)
        # f[11]: axes_recherche_json (Doctorat)

        content = (
            f"--- FICHE FORMATION ---\n"
            f"Nom de la formation / Filière : {f[2]}\n"
            f"Département de rattachement : {f[1]}\n"
            f"Cycle d'étude : {f[0]}\n"
        )
        
        # On ajoute les champs dynamiquement seulement s'ils existent (pour éviter les "None")
        if f[4]: content += f"Spécialité de la formation : {f[4]}\n"
        if f[3]: content += f"Professeur Coordonnateur / Responsable de la formation : {f[3]}\n"
        if f[8]: content += f"Domaine de recherche : {f[8]}\n"
        if f[9]: content += f"Description de la formation : {f[9]}\n"
        if f[5]: content += f"Objectifs pédagogiques : {f[5]}\n"
        if f[6]: content += f"Débouchés professionnels : {f[6]}\n"
        if f[7]: content += f"Public cible / Conditions d'admission : {f[7]}\n"
        if f[10]: content += f"Liste des modules enseignés : {f[10]}\n"
        if f[11]: content += f"Axes de recherche : {f[11]}\n"

        documents.append(Document(page_content=content, metadata={"source": "formations", "type": "formation", "filiere": f[2]}))

    # 2. Professeurs
    profs = con.execute("SELECT * FROM clean_data.stg_professeurs").fetchall()
    for p in profs:
        # Mappage précis selon stg_professeurs.sql :
        # p[0]: nom_professeur
        # p[1]: statut
        # p[2]: linkedin_url
        # p[3]: email
        # p[4]: scopus_profile_url
        # p[5]: biographie
        # p[6]: nom_departement

        content = (
            f"--- FICHE PROFESSEUR ---\n"
            f"Nom complet du professeur : {p[0]}\n"
        )
        
        # Ajout conditionnel pour éviter les valeurs "None" ou vides
        if p[6]: content += f"Département de rattachement : {p[6]}\n"
        if p[1] and str(p[1]).strip(): content += f"Statut / Grade académique : {p[1]}\n"
        if p[3]: content += f"Adresse e-mail professionnelle de contact : {p[3]}\n"
        if p[2]: content += f"Lien vers le profil professionnel LinkedIn : {p[2]}\n"
        if p[4]: content += f"Lien vers le profil de recherche académique Scopus : {p[4]}\n"
        if p[5]: content += f"Biographie, parcours et spécialités de recherche : {p[5]}\n"

        documents.append(Document(page_content=content, metadata={"source": "professeurs", "type": "professeur", "nom": p[0]}))

    # 3. Laboratoires
    labos = con.execute("SELECT * FROM clean_data.stg_laboratoires").fetchall()
    for l in labos:
        # Mappage estimé : l[0]:nom, l[1]:acronyme, l[2]:desc, l[3]:dir, l[4]:dir_adj, l[5]:equipes_json
        content = (
            f"--- FICHE LABORATOIRE DE RECHERCHE ---\n"
            f"Nom complet du laboratoire : {l[0]}\n"
            f"Acronyme du laboratoire : {l[1]}\n"
            f"Description et mission : {l[2]}\n"
            f"Professeur Directeur du laboratoire : {l[3]}\n"
            f"Professeur Directeur Adjoint : {l[4]}\n"
            f"Liste des équipes de recherche et leurs membres : {l[5]}\n"
        )
        documents.append(Document(page_content=content, metadata={"source": "laboratoires", "type": "laboratoire", "acronyme": l[1]}))

    # 4. Départements
    depts = con.execute("SELECT * FROM clean_data.stg_departements").fetchall()
    for d in depts:
        content = (
            f"--- FICHE DÉPARTEMENT ACADÉMIQUE ---\n"
            f"Nom du département : {d[0]}\n"
            f"Professeur Chef du département : {d[1]}\n"
            f"Description et missions du département : {d[2]}\n"
        )
        documents.append(Document(page_content=content, metadata={"source": "departements", "type": "departement", "nom": d[0]}))

    # 5. Emplois du temps
    emplois = con.execute("SELECT * FROM clean_data.stg_emplois").fetchall()
    for e in emplois:
        content = (
            f"--- FICHE EMPLOI DU TEMPS ---\n"
            f"Section / Classe concernée : {e[0]}\n"
            f"Planning complet des cours de la semaine : {e[1]}\n"
        )
        documents.append(Document(page_content=content, metadata={"source": "emplois", "type": "emploi_du_temps", "section": e[0]}))

    # 6. Faculté (FSBM)
    fac = con.execute("SELECT * FROM clean_data.stg_faculte").fetchall()
    for f in fac:
        # Mappage précis selon stg_faculte.sql :
        # f[0]: nom_officiel
        # f[1]: acronyme
        # f[2]: universite_de_rattachement
        # f[3]: annee_de_creation
        # f[4]: doyen
        # f[5]: vice_doyen
        # f[6]: description
        # f[7]: adresse
        # f[8]: fax
        # f[9]: site_web
        # f[10]: emails_json
        # f[11]: localisation_json
        # f[12]: telephones_json
        # f[13]: departements_inclus_json

        content = (
            f"--- FICHE ÉTABLISSEMENT ---\n"
            f"Nom officiel de l'établissement : {f[0]}\n"
        )
        
        # Ajout conditionnel pour plus de propreté
        if f[1]: content += f"Acronyme de la faculté : {f[1]}\n"
        if f[2]: content += f"Université de rattachement : {f[2]}\n"
        if f[3]: content += f"Année de création : {f[3]}\n"
        if f[4]: content += f"Professeur Doyen actuel : {f[4]}\n"
        if f[5]: content += f"Professeur Vice-doyen actuel : {f[5]}\n"
        if f[6]: content += f"Description générale et missions de l'établissement : {f[6]}\n"
        if f[7]: content += f"Adresse postale complète : {f[7]}\n"
        if f[8]: content += f"Numéro de Fax : {f[8]}\n"
        if f[9]: content += f"Site web officiel : {f[9]}\n"
        if f[10]: content += f"Adresses e-mail de contact (Administration, Scolarité, IA) : {f[10]}\n"
        if f[11]: content += f"Localisation géographique détaillée (Ville, Région, Pays) : {f[11]}\n"
        if f[12]: content += f"Numéros de téléphone officiels : {f[12]}\n"
        if f[13]: content += f"Liste des départements inclus dans la faculté : {f[13]}\n"

        documents.append(Document(page_content=content, metadata={"source": "faculte", "type": "etablissement", "nom": f[0]}))

    con.close()
    return documents