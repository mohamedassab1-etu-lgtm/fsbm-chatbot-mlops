import duckdb
from langchain_core.documents import Document

def load_data_as_documents():
    con = duckdb.connect('../data/duckdb/fsbm.duckdb')
    documents = []

    # 1. Formations
    formations = con.execute("SELECT * FROM clean_data.stg_formations").fetchall()
    for f in formations:
        # f[0]:cycle, f[1]:nom_dept, f[2]:nom_filiere, f[3]:coord, f[4]:specialite, f[5]:obj, f[6]:deb, f[7]:cible, f[8]:domaine, f[9]:desc, f[10]:modules, f[11]:axes_recherche
        content = (f"Formation FSBM: {f[2]} dans le département {f[1]}. "
                   f"Cycle: {f[0]}, Spécialité: {f[4]}. "
                   f"Coordonnateur: {f[3]}. "
                   f"Objectifs: {f[5]}. Débouchés: {f[6]}. "
                   f"Public cible: {f[7]}. "
                   f"Domaine: {f[8]}. "
                   f"Description: {f[9]}."
                   f"Modules: {f[10]}. Axes de recherche: {f[11]}")
        documents.append(Document(page_content=content, metadata={"source": "formations", "filiere": f[2]}))

    # 2. Professeurs
    profs = con.execute("SELECT * FROM clean_data.stg_professeurs").fetchall()
    for p in profs:
        # p[0]:nom, p[1]:statut, p[2]:linkedin, p[3]:email, p[4]:scopus, p[5]:bio, p[6]:dept
        content = (f"Professeur: {p[0]}, Statut: {p[1]}. "
                   f"LinkedIn: {p[2]}, Email: {p[3]}, Scopus: {p[4]}. "
                   f"Biographie: {p[5]}. Département: {p[6]}")
        documents.append(Document(page_content=content, metadata={"source": "professeurs", "nom": p[0]}))

    # 3. Laboratoires
    labos = con.execute("SELECT * FROM clean_data.stg_laboratoires").fetchall()
    for l in labos:
        content = (f"Laboratoire: {l[0]} ({l[1]}). Description: {l[2]}. "
                   f"Directeur: {l[3]}. Directeur Adjoint: {l[4]}. Équipes et membres: {l[5]}")
        documents.append(Document(page_content=content, metadata={"source": "laboratoires", "nom": l[0]}))

    # 4. Départements
    depts = con.execute("SELECT * FROM clean_data.stg_departements").fetchall()
    for d in depts:
        # d[0]:nom, d[1]:chef, d[2]:desc
        content = f"Département {d[0]} dirigé par {d[1]}. Missions: {d[2]}"
        documents.append(Document(page_content=content, metadata={"source": "departements", "nom": d[0]}))

    # 5. Emplois du temps
    emplois = con.execute("SELECT * FROM clean_data.stg_emplois").fetchall()
    for e in emplois:
        # e[0]:section, e[1]:planning_json
        content = f"Emploi du temps pour la section {e[0]}: {e[1]}"
        documents.append(Document(page_content=content, metadata={"source": "emplois", "section": e[0]}))

    # 6. Faculté (FSBM)
    fac = con.execute("SELECT * FROM clean_data.stg_faculte").fetchall()
    for f in fac:
        # f[0]:nom, f[1]:acronyme, f[2]:univ, f[3]:annee_creation, f[4]:doyen, f[5]:vice_doyen, f[6]:description, f[7]:adresse, f[8]:fax, f[9]:site_web, f[10]:emails, f[11]:localisation, f[12]:tels, f[13]:departements
        content = (f"Faculté: {f[0]} ({f[1]}), Université: {f[2]}, Année de création: {f[3]}. "
                   f"Doyen: {f[4]}, Vice-Doyen: {f[5]}. "
                   f"Description: {f[6]}. Adresse: {f[7]}, Fax: {f[8]}, Site web: {f[9]}. "
                   f"Emails: {f[10]}, Localisation: {f[11]}, Téléphones: {f[12]}. "
                   f"Départements: {f[13]}")
        documents.append(Document(page_content=content, metadata={"source": "faculte"}))

    con.close()
    return documents