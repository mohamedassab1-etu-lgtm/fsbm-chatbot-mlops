import ast
import re

import duckdb
from langchain_core.documents import Document


def normalize_name(name: str) -> str:
    """Normalize a person's name so it can be matched reliably across
    sources that format names differently - e.g. formations.json has
    'BENTAIB MOHSSINE' while professeurs.json has 'Pr. Mohssine Bentaib'
    for the same person. Strips titles/punctuation/case and sorts the
    remaining tokens so word order doesn't matter."""
    if not name:
        return ""
    name = name.lower()
    name = re.sub(r"\b(pr\.?|prof\.?|professeur|professeure|dr\.?)\b", "", name)
    name = re.sub(r"[^\w\s]", " ", name)
    tokens = sorted(t for t in name.split() if t)
    return " ".join(tokens)


TITLE_PREFIX_REGEX = re.compile(r"^\s*(pr\.?|prof\.?|professeure?|dr\.?)\s+", re.IGNORECASE)


def format_prof_name(name: str) -> str:
    """Always displays a person's name with a normalized 'Pr. ' prefix,
    regardless of whether the source data includes a title or not. All
    four source files (professeurs, departements, laboratoires,
    formations) have had their title prefixes stripped, so the LLM
    interacts with bare names internally, but this re-adds a consistent
    prefix at display time so answers always read 'Pr. X'."""
    if not name:
        return name
    name = name.strip()
    stripped = TITLE_PREFIX_REGEX.sub("", name).strip()
    return f"Pr. {stripped}" if stripped else name


TEAM_BLOCK_REGEX = re.compile(r"\{'name':\s*(?P<team>[^,]+?),\s*'membres':\s*\[(?P<members>.*?)\]\}")
MEMBER_NAME_REGEX = re.compile(r"'name':\s*([^,}]+)")


def clean_stray_quotes(value: str) -> str:
    """Some team names in the source data have literal stray single-quote
    characters embedded (e.g. "'Modélisation Dirigée par la Donnée (MDD)'"
    - quotes are part of the string value itself, not a parsing artifact).
    Strips a matching leading/trailing quote if present."""
    if not value:
        return value
    value = value.strip()
    if len(value) >= 2 and value[0] == "'" and value[-1] == "'":
        value = value[1:-1].strip()
    return value


def parse_lab_teams(equipes_raw: str) -> list:
    """Parses the equipes_json string (DuckDB VARCHAR cast of the nested
    laboratoires struct) into (team_name, [member_names]) pairs, properly
    scoped per team. This matters because a flat name-extraction across
    the whole lab can't tell you WHICH équipe a given professor belongs
    to - only that they're somewhere in the lab. The structure only
    nests one level deep (team dicts containing a flat member-dict list),
    so a non-greedy match up to the first ']' correctly closes each
    team's member list without needing a full parser."""
    if not equipes_raw:
        return []
    teams = []
    for m in TEAM_BLOCK_REGEX.finditer(equipes_raw):
        team_name = clean_stray_quotes(m.group("team").strip())
        member_names = [mm.strip() for mm in MEMBER_NAME_REGEX.findall(m.group("members"))]
        teams.append((team_name, member_names))
    return teams


def parse_email_list(raw):
    """stg_professeurs now aggregates multiple emails per prof via
    CAST(list(value) AS VARCHAR) in DuckDB, which produces a string like
    '[a@x.com, b@y.com]', '[]' (no emails), or None (no rows at all).
    This turns that back into a clean Python list of strings."""
    if not raw:
        return []
    raw = raw.strip()
    inner = raw.strip("[]").strip()
    if not inner:
        return []
    return [e.strip() for e in inner.split(",") if e.strip()]


def load_data_as_documents():
    con = duckdb.connect('../data/duckdb/fsbm.duckdb') # Assure-toi que le chemin est correct selon l'emplacement du script
    documents = []

    # Fetch laboratoires first (before professeurs/formations) so we can
    # build a normalized-name -> lab lookup from each lab's team member
    # lists. This closes a real multi-hop gap: questions like "who's the
    # coordonnateur of X, which lab do they research in, and who directs
    # that lab" previously needed the retriever to pull a formation doc
    # AND the right laboratoire doc in the same query, which the
    # type-filtered retriever can't do reliably. Baking the lab
    # affiliation + director directly into the professeur/formation cards
    # means a single retrieved document already has the full answer.
    labs_rows = con.execute("SELECT * FROM clean_data.stg_laboratoires").fetchall()
    member_to_lab = {}
    for l in labs_rows:
        # l[0]:nom, l[1]:acronyme, l[3]:directeur, l[5]:equipes_json
        for team_name, member_names in parse_lab_teams(l[5]):
            for member_name in member_names:
                key = normalize_name(member_name)
                if key:
                    member_to_lab.setdefault(key, (l[0], l[1], l[3], team_name))

    # Fetch professeurs first (before formations) so we can build a
    # normalized-name -> emails lookup, used to attach the coordonnateur's
    # email onto formation cards (formations.json has an E.MAIL field per
    # filiere, but that field currently isn't carried through stg_formations -
    # cross-referencing against the professeurs table works around that,
    # and stays correct even if the two sources' name formats differ).
    profs_rows = con.execute("SELECT * FROM clean_data.stg_professeurs").fetchall()
    prof_email_lookup = {}
    for p in profs_rows:
        key = normalize_name(p[0])
        if key:
            prof_email_lookup[key] = parse_email_list(p[3])

    # Reverse lookup built while processing formations below, then used
    # when building professeur cards: which formation(s) does a given
    # person coordinate. Needed because a question about a named
    # professor ("does X coordinate a licence?") won't necessarily
    # retrieve the formation doc, so this bakes the answer into their
    # own professeur card instead.
    coord_formations_lookup = {}

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
        if f[3]:
            content += f"Professeur Coordonnateur / Responsable de la formation : {format_prof_name(f[3])}\n"
            coord_key = normalize_name(f[3])
            coord_formations_lookup.setdefault(coord_key, []).append(f[2])

            coord_emails = prof_email_lookup.get(coord_key, [])
            if len(coord_emails) == 1:
                content += f"Adresse e-mail de contact du coordonnateur : {coord_emails[0]}\n"
            elif len(coord_emails) > 1:
                content += f"Adresses e-mail de contact du coordonnateur : {', '.join(coord_emails)}\n"

            coord_lab = member_to_lab.get(coord_key)
            if coord_lab:
                lab_nom, lab_acronyme, lab_directeur, team_name = coord_lab
                content += f"Laboratoire de recherche du coordonnateur : {lab_nom} ({lab_acronyme})\n"
                if team_name:
                    content += f"Équipe de recherche du coordonnateur : {team_name}\n"
                content += f"Directeur de ce laboratoire : {format_prof_name(lab_directeur)}\n"
        if f[8]: content += f"Domaine de recherche : {f[8]}\n"
        if f[9]: content += f"Description de la formation : {f[9]}\n"
        if f[5]: content += f"Objectifs pédagogiques : {f[5]}\n"
        if f[6]: content += f"Débouchés professionnels : {f[6]}\n"
        if f[7]: content += f"Public cible / Conditions d'admission : {f[7]}\n"
        if f[10]: content += f"Liste des modules enseignés : {f[10]}\n"
        if f[11]: content += f"Axes de recherche : {f[11]}\n"

        documents.append(Document(page_content=content, metadata={"source": "formations", "type": "formation", "filiere": f[2]}))

    # 2. Professeurs
    profs = profs_rows
    for p in profs:
        # Mappage précis selon stg_professeurs.sql :
        # p[0]: nom_professeur
        # p[1]: statut
        # p[2]: linkedin_url
        # p[3]: emails_json (liste d'e-mails, sérialisée en string par DuckDB)
        # p[4]: scopus_profile_url
        # p[5]: biographie
        # p[6]: nom_departement

        content = (
            f"--- FICHE PROFESSEUR ---\n"
            f"Nom complet du professeur : {format_prof_name(p[0])}\n"
        )
        
        # Ajout conditionnel pour éviter les valeurs "None" ou vides
        if p[6]: content += f"Département de rattachement : {p[6]}\n"
        if p[1] and str(p[1]).strip(): content += f"Statut / Grade académique : {p[1]}\n"

        emails = parse_email_list(p[3])
        if len(emails) == 1:
            content += f"Adresse e-mail professionnelle de contact : {emails[0]}\n"
        elif len(emails) > 1:
            content += f"Adresses e-mail professionnelles de contact : {', '.join(emails)}\n"

        if p[2]: content += f"Lien vers le profil professionnel LinkedIn : {p[2]}\n"
        if p[4]: content += f"Lien vers le profil de recherche académique Scopus : {p[4]}\n"
        if p[5]: content += f"Biographie, parcours et spécialités de recherche : {p[5]}\n"

        prof_lab = member_to_lab.get(normalize_name(p[0]))
        if prof_lab:
            lab_nom, lab_acronyme, lab_directeur, team_name = prof_lab
            content += f"Laboratoire de recherche de rattachement : {lab_nom} ({lab_acronyme})\n"
            if team_name:
                content += f"Équipe de recherche : {team_name}\n"

        coordinated = coord_formations_lookup.get(normalize_name(p[0]), [])
        if coordinated:
            content += f"Formation(s) coordonnée(s) par ce professeur : {', '.join(coordinated)}\n"

        documents.append(Document(page_content=content, metadata={"source": "professeurs", "type": "professeur", "nom": p[0]}))

    # 3. Laboratoires
    labos = labs_rows
    for l in labos:
        # Mappage estimé : l[0]:nom, l[1]:acronyme, l[2]:desc, l[3]:dir, l[4]:dir_adj, l[5]:equipes_json
        content = (
            f"--- FICHE LABORATOIRE DE RECHERCHE ---\n"
            f"Nom complet du laboratoire : {l[0]}\n"
            f"Acronyme du laboratoire : {l[1]}\n"
            f"Description et mission : {l[2]}\n"
            f"Professeur Directeur du laboratoire : {format_prof_name(l[3])}\n"
            f"Professeur Directeur Adjoint : {format_prof_name(l[4])}\n"
            f"Liste des équipes de recherche et leurs membres : {l[5]}\n"
        )
        documents.append(Document(page_content=content, metadata={"source": "laboratoires", "type": "laboratoire", "acronyme": l[1]}))

    # 4. Départements
    dept_filieres = {}
    for f in formations:
        # On ajoute le responsable directement dans le résumé du département !
        coord_info = f" (Coordonnateur : {format_prof_name(f[3])})" if f[3] else ""
        dept_filieres.setdefault(f[1], []).append(f"- {f[0]} {f[2]}{coord_info}")

    depts = con.execute("SELECT * FROM clean_data.stg_departements").fetchall()
    for d in depts:
        content = (
            f"--- FICHE DÉPARTEMENT ACADÉMIQUE ---\n"
            f"Nom du département : {d[0]}\n"
            f"Professeur Chef du département : {format_prof_name(d[1])}\n"
            f"Description et missions du département : {d[2]}\n"
        )
        filieres = dept_filieres.get(d[0], [])
        if filieres:
            content += f"Filières et formations proposées par ce département :\n" + "\n".join(filieres) + "\n"
        documents.append(Document(page_content=content, metadata={"source": "departements", "type": "departement", "nom": d[0]}))

    # 5. Emplois du temps
    emplois = con.execute("SELECT * FROM clean_data.stg_emplois").fetchall()
    for e in emplois:
        planning_text = ""
        try:
            # Decode the main JSON string built by DuckDB
            dict_planning = json.loads(e[1])
            for jour, creneaux in dict_planning.items():
                for heure, liste_cours in creneaux.items():
                    
                    # FIX: If DuckDB returned the list as a string, decode it into a Python list
                    if isinstance(liste_cours, str):
                        try:
                            liste_cours = json.loads(liste_cours)
                        except:
                            pass

                    # Ensure there are courses in this time slot
                    if liste_cours and isinstance(liste_cours, list): 
                        for cours in liste_cours:
                            c_type = cours.get("type", "")
                            c_mod = cours.get("module", "")
                            c_salle = cours.get("salle", "")
                            c_groupe = cours.get("groupe", "")
                            
                            # Skip if the course object is essentially empty
                            if not c_mod and not c_type:
                                continue
                                
                            # Format the time nicely (e.g., "08h30_10h00" -> "08h30 à 10h00")
                            heure_propre = heure.replace('_', ' à ')
                            
                            # Build the descriptive sentence
                            details = ""
                            if c_type: details += f"[{c_type}] "
                            if c_mod: details += f"{c_mod}"
                            if c_groupe: details += f" pour le groupe {c_groupe}"
                            if c_salle: details += f" (Salle: {c_salle})"
                                
                            planning_text += f"- Le {jour} de {heure_propre} : {details.strip()}\n"
        except Exception as ex:
            planning_text = f"Erreur de lecture du planning : {ex}"

        if not planning_text.strip():
            planning_text = "Aucun cours programmé pour cette section."

        content = (
            f"--- FICHE EMPLOI DU TEMPS ---\n"
            f"Section / Classe concernée : {e[0]}\n"
            f"Planning complet des cours de la semaine :\n{planning_text}\n"
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
        if f[4]: content += f"Professeur Doyen actuel : {format_prof_name(f[4])}\n"
        if f[5]: content += f"Professeur Vice-doyen actuel : {format_prof_name(f[5])}\n"
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