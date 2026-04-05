"""
BoviBot — Backend FastAPI
Gestion d'élevage bovin avec LLM + PL/SQL
Projet L3 — ESP/UCAD
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import mysql.connector
import os, re, json, httpx
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from fastapi.responses import StreamingResponse

app = FastAPI(title="BoviBot API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Configuration ───────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "bovibot"),
}
LLM_API_KEY  = os.getenv("OPENAI_API_KEY", "")
LLM_MODEL    = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")

# ── Schéma BDD pour le prompt ───────────────────────────────────
DB_SCHEMA = """
Tables MySQL :
- races(id, nom, origine, poids_adulte_moyen_kg, production_lait_litre_jour)
- animaux(id, numero_tag, nom, race_id, sexe[M/F], date_naissance, poids_actuel, statut[actif/vendu/mort/quarantaine], mere_id, pere_id, notes, created_at)
  (Note : numero_tag est l'identifiant unique visible (ex: TAG-001). race_id -> races.id. mere_id et pere_id sont des FK vers animaux.id pour la généalogie.)
- pesees(id, animal_id, poids_kg, date_pesee, agent, notes)
- sante(id, animal_id, type[vaccination/traitement/examen/chirurgie], description, date_acte, veterinaire, medicament, cout, prochain_rdv)
- reproduction(id, mere_id, pere_id, date_saillie, date_velage_prevue, date_velage_reelle, nb_veaux, statut[en_gestation/vele/avortement/echec])
- alimentation(id, animal_id, type_aliment, quantite_kg, date_alimentation, cout_unitaire_kg)
- ventes(id, animal_id, acheteur, telephone_acheteur, date_vente, poids_vente_kg, prix_fcfa)
- alertes(id, animal_id, type, message, niveau[info/warning/critical], traitee)
- historique_statut(id, animal_id, ancien_statut, nouveau_statut, date_changement)

Fonctions :
- fn_age_en_mois(animal_id) -> INT
- fn_gmq(animal_id) -> DECIMAL (gain moyen quotidien en kg/jour)
- fn_cout_total_elevage(animal_id) -> DECIMAL (somme cumulée alimentation + santé)

Procédures disponibles :
- sp_enregistrer_pesee(animal_id, poids_kg, date, agent)
- sp_declarer_vente(animal_id, acheteur, telephone, prix_fcfa, poids_vente_kg, date_vente)
"""

def get_system_prompt():
    today = datetime.now().strftime("%Y-%m-%d")
    return f"""Tu es BoviBot, l'assistant IA expert d'un élevage bovin.
Tu aides l'éleveur à gérer son troupeau en traduisant ses demandes en SQL ou en actions.
Nous sommes le {today}.

{DB_SCHEMA}

### BLOC 1 — FORMAT DE RÉPONSE OBLIGATOIRE
Réponds exclusivement en JSON pur, sans markdown.
- Consultation : {{"type":"query", "sql":"SELECT ...", "explication":"..."}}
- Action : {{"type":"action", "action":"nom_procedure", "params":{{...}}, "explication":"...", "confirmation":"..."}}
- Info : {{"type":"info", "sql":null, "explication":"..."}}

### BLOC 2 — RÈGLES SQL
- Filtrer `statut='actif'` par défaut sauf demande explicite.
- Utiliser `fn_age_en_mois(a.id)`, `fn_gmq(a.id)` et `fn_cout_total_elevage(a.id)`.
- Pour la généalogie, utilise des jointures sur `mere_id` ou `pere_id`. Ex: "Mère de TAG-006" -> `SELECT m.numero_tag FROM animaux a JOIN animaux m ON a.mere_id = m.id WHERE a.numero_tag = 'TAG-006'`.
- Ne jamais générer de DELETE ou DROP. Limiter à 100 résultats.

### BLOC 3 — PROCÉDURES DISPONIBLES
1. sp_enregistrer_pesee(animal_id, poids_kg, date, agent)
- Mots-clés : "enregistre pesée", "pèse", "nouveau poids", "pesée de"
2. sp_declarer_vente(animal_id, acheteur, telephone, prix_fcfa, poids_vente_kg, date_vente)
- Mots-clés : "déclare vente", "vends", "cède l'animal", "vendu à"
3. sp_rapport_nutritionnel(animal_id)
- Mots-clés : "rapport nutritionnel", "consommation", "ration", "combien il mange"

IMPORTANT : Les paramètres 'date' ou 'date_vente' doivent être '{today}' ou une date au format YYYY-MM-DD. Ne jamais mettre 'CURDATE()' dans les params JSON.

### BLOC 4 — RÉSOLUTION DES IDENTIFIANTS
- L'éleveur utilise le `numero_tag` (ex: TAG-001).
- Consultation : Fais une jointure ou un WHERE sur `numero_tag`.
- Action : Si tu n'as pas l'ID technique (animal_id), retourne un type 'info' demandant de confirmer l'animal ou cherche l'ID via une requête préalable. Ne jamais inventer d'ID.
"""

# ── Sécurité ────────────────────────────────────────────────────
def validate_sql(sql: str):
    """Vérifie que la requête SQL est une consultation (SELECT) uniquement et bloque l'exfiltration"""
    # Nettoyage et normalisation
    clean_sql = sql.strip().upper()
    
    # Liste noire étendue : manipulation + exfiltration
    forbidden = [
        "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", 
        "GRANT", "REVOKE", "EXEC", "CALL", "UNION", "INTO", "OUTFILE", 
        "LOAD_FILE", "INFORMATION_SCHEMA", "SCHEMA", "DUMPFILE"
    ]
    
    if not clean_sql.startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Seules les requêtes de type SELECT sont autorisées pour la consultation.")
    
    for word in forbidden:
        # On vérifie avec des regex ou des espaces pour éviter les faux positifs (ex: "SELECT ... FROM ...")
        if re.search(rf"\b{word}\b", clean_sql):
            raise HTTPException(status_code=400, detail=f"Mot-clé interdit détecté dans la requête SQL : {word}")

def sanitize_input(text: str) -> str:
    """Filtrage renforcé contre les tentatives d'injection de prompt"""
    # Liste étendue de patterns suspects (Prompt Injection, Jailbreak, Exfiltration)
    suspicious_patterns = [
        r"ignore.*instructions",
        r"system prompt",
        r"tu es maintenant",
        r"forget.*previous",
        r"n'écoute plus",
        r"réponds en tant que",
        r"dévoile.*prompt",
        r"jailbreak",
        r"do anything now",
        r"dan mode",
        r"imagine que",
        r"hypothetical scenario",
        r"nouvelles instructions",
        r"recommence à zéro",
        r"start from scratch",
        r"affiche.*le code",
        r"contenu de ton prompt",
        r"règles de sécurité",
        r"bypass",
        r"contourne",
        r"supprime.*données",
        r"mot de passe",
        r"clé api",
        r"api key",
        r"config",
        r"secret",
        r"base64",
        r"rot13",
        r"traduis.*en.*sql"
    ]
    
    clean_text = text.lower()
    for pattern in suspicious_patterns:
        if re.search(pattern, clean_text):
            # Au lieu de bloquer, on pourrait aussi simplement logger et nettoyer, 
            # mais bloquer est plus sûr pour un projet académique.
            raise HTTPException(status_code=400, detail="Requête suspecte détectée (Prompt Injection).")
    
    return text

# ── Connexion MySQL ─────────────────────────────────────────────
def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def execute_query(sql: str, params: list = None):
    # Validation de sécurité avant exécution
    validate_sql(sql)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(sql, params or [])
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erreur base de données : {err.msg}")
    finally:
        cursor.close(); conn.close()

def call_procedure(name: str, params: dict):
    """Appelle une procédure stockée PL/SQL"""
    conn = get_db()
    cursor = conn.cursor()
    try:
        if name == "sp_enregistrer_pesee":
            cursor.callproc("sp_enregistrer_pesee", [
                params["animal_id"], params["poids_kg"],
                params["date"], params.get("agent", "BoviBot")
            ])
        elif name == "sp_declarer_vente":
            cursor.callproc("sp_declarer_vente", [
                params["animal_id"], params["acheteur"],
                params.get("telephone", ""), params["prix_fcfa"],
                params.get("poids_vente_kg", 0), params["date_vente"]
            ])
        elif name == "sp_rapport_nutritionnel":
            cursor.callproc("sp_rapport_nutritionnel", [params["animal_id"]])
        conn.commit()
        return {"success": True}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur PL/SQL : {err.msg}")
    finally:
        cursor.close(); conn.close()

# ── Appel LLM ──────────────────────────────────────────────────
async def ask_llm(question: str, history: list = []) -> dict:
    messages = [{"role": "system", "content": get_system_prompt()}]
    messages += history[-6:]  # contexte des 3 derniers échanges
    messages.append({"role": "user", "content": question})
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(
                f"{LLM_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {LLM_API_KEY}"},
                json={"model": LLM_MODEL, "messages": messages, "temperature": 0},
                timeout=30,
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                return json.loads(match.group())
            raise ValueError("L'IA a renvoyé un format invalide.")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise HTTPException(status_code=401, detail="Clé API LLM invalide ou expirée.")
            if e.response.status_code == 429:
                raise HTTPException(status_code=429, detail="Quota LLM dépassé ou trop de requêtes.")
            raise HTTPException(status_code=e.response.status_code, detail=f"Erreur LLM : {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur technique : {str(e)}")

# ── Routes API ──────────────────────────────────────────────────
class ChatMessage(BaseModel):
    question: str
    history: list = []
    confirm_action: bool = False
    pending_action: dict = {}

@app.post("/api/chat")
async def chat(msg: ChatMessage):
    try:
        # 1. Protection contre le prompt injection
        msg.question = sanitize_input(msg.question)
        
        # Si l'utilisateur confirme une action en attente
        if msg.confirm_action and msg.pending_action:
            result = call_procedure(msg.pending_action["action"], msg.pending_action["params"])
            return {"type": "action_done", "answer": "Action effectuée avec succès !", "data": []}

        llm = await ask_llm(msg.question, msg.history)
        t = llm.get("type", "info")

        if t == "query":
            sql = llm.get("sql")
            if not sql:
                return {"type": "info", "answer": llm.get("explication",""), "data": []}
            data = execute_query(sql)
            return {"type":"query","answer":llm.get("explication",""),"data":data,"sql":sql,"count":len(data)}

        elif t == "action":
            # Retourner pour confirmation avant exécution
            return {
                "type": "action_pending",
                "answer": llm.get("explication",""),
                "confirmation": llm.get("confirmation","Confirmer cette action ?"),
                "pending_action": {"action": llm.get("action"), "params": llm.get("params",{})},
                "data": []
            }

        else:
            return {"type":"info","answer":llm.get("explication",""),"data":[]}

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Une erreur est survenue : {str(e)}")

@app.get("/api/dashboard")
def dashboard():
    stats = {}
    queries = {
        "total_actifs":      "SELECT COUNT(*) as n FROM animaux WHERE statut='actif'",
        "femelles":          "SELECT COUNT(*) as n FROM animaux WHERE statut='actif' AND sexe='F'",
        "males":             "SELECT COUNT(*) as n FROM animaux WHERE statut='actif' AND sexe='M'",
        "en_gestation":      "SELECT COUNT(*) as n FROM reproduction WHERE statut='en_gestation'",
        "alertes_actives":   "SELECT COUNT(*) as n FROM alertes WHERE traitee=FALSE",
        "alertes_critiques": "SELECT COUNT(*) as n FROM alertes WHERE traitee=FALSE AND niveau='critical'",
        "ventes_mois":       "SELECT COUNT(*) as n FROM ventes WHERE MONTH(date_vente)=MONTH(NOW())",
        "ca_mois":           "SELECT COALESCE(SUM(prix_fcfa),0) as n FROM ventes WHERE MONTH(date_vente)=MONTH(NOW())",
        "gmq_moyen":         "SELECT COALESCE(AVG(fn_gmq(id)), 0) as n FROM animaux WHERE statut='actif'",
        "vaccines_annee":    "SELECT COUNT(DISTINCT animal_id) as n FROM sante WHERE type='vaccination' AND date_acte >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)",
        "rdv_a_venir":       "SELECT COUNT(*) as n FROM sante WHERE prochain_rdv >= CURDATE()"
    }
    for k, sql in queries.items():
        result = execute_query(sql)
        stats[k] = result[0]["n"] if result else 0
    return stats

@app.get("/api/stats/poids-mensuel")
def get_poids_mensuel():
    # Calcule le poids moyen par mois sur les 6 derniers mois
    return execute_query("""
        SELECT DATE_FORMAT(date_pesee, '%Y-%m') as tri, 
               DATE_FORMAT(date_pesee, '%b') as mois, 
               ROUND(AVG(poids_kg), 1) as poids
        FROM pesees
        WHERE date_pesee >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY tri, mois
        ORDER BY tri ASC
    """)

@app.get("/api/stats/sante-repartition")
def get_sante_repartition():
    # Compte réel des actes par type
    return execute_query("""
        SELECT type, COUNT(*) as n 
        FROM sante 
        GROUP BY type
    """)

# ── Endpoints Rapports ──────────────────────────────────────────
@app.get("/api/settings")
def get_settings():
    # Simulation de stockage de paramètres (idéalement en base de données)
    return {
        "farm_name": "Ferme Pilote BoviBot",
        "supervisor": "Admin Intel",
        "llm_model": LLM_MODEL,
        "alert_threshold_gmq": 0.3,
        "db_status": "connected"
    }

@app.post("/api/settings")
async def update_settings(settings: dict):
    # Logique de mise à jour (ici on simule le succès)
    return {"status": "success", "message": "Paramètres mis à jour"}

@app.get("/api/reports/finance")
def get_report_finance():
    # Ventes mensuelles sur 12 mois
    return execute_query("""
        SELECT DATE_FORMAT(date_vente, '%b %y') as mois, SUM(prix_fcfa) as total 
        FROM ventes 
        WHERE date_vente >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY mois ORDER BY MIN(date_vente) ASC
    """)

@app.get("/api/reports/races-performance")
def get_report_races():
    # GMQ moyen par race
    return execute_query("""
        SELECT r.nom as race, ROUND(AVG(fn_gmq(a.id)), 3) as gmq_moyen 
        FROM animaux a 
        JOIN races r ON a.race_id = r.id 
        WHERE a.statut = 'actif' 
        GROUP BY r.nom
        HAVING gmq_moyen IS NOT NULL
        ORDER BY gmq_moyen DESC
    """)

@app.get("/api/reports/demography")
def get_report_demo():
    # Répartition par sexe
    return execute_query("""
        SELECT sexe, COUNT(*) as count 
        FROM animaux 
        WHERE statut = 'actif' 
        GROUP BY sexe
    """)

@app.get("/api/reports/profitability")
def get_report_profitability():
    # Prix de vente moyen par race
    return execute_query("""
        SELECT r.nom as race, ROUND(AVG(v.prix_fcfa), 0) as prix_moyen
        FROM ventes v
        JOIN animaux a ON v.animal_id = a.id
        JOIN races r ON a.race_id = r.id
        GROUP BY r.nom
        ORDER BY prix_moyen DESC
    """)

@app.get("/api/reports/health-costs")
def get_report_health_costs():
    # Dépenses santé par mois
    return execute_query("""
        SELECT DATE_FORMAT(date_acte, '%b %y') as mois, SUM(cout) as total
        FROM sante
        WHERE date_acte >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY mois ORDER BY MIN(date_acte) ASC
    """)

@app.get("/api/animaux")
def get_animaux():
    return execute_query("""
        SELECT a.*, r.nom as race, fn_age_en_mois(a.id) as age_mois,
               fn_gmq(a.id) as gmq_kg_jour
        FROM animaux a
        LEFT JOIN races r ON a.race_id = r.id
        WHERE a.statut = 'actif'
        ORDER BY a.numero_tag
    """)

class AnimalCreate(BaseModel):
    numero_tag: str
    nom: str = None
    race_id: int
    sexe: str
    date_naissance: str

@app.post("/api/animaux")
def create_animal(animal: AnimalCreate):
    sql = "INSERT INTO animaux (numero_tag, nom, race_id, sexe, date_naissance, statut) VALUES (%s, %s, %s, %s, %s, 'actif')"
    params = (animal.numero_tag, animal.nom, animal.race_id, animal.sexe, animal.date_naissance)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        conn.commit()
        return {"status": "success"}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=err.msg)
    finally:
        cursor.close(); conn.close()

@app.get("/api/races")
def get_races():
    return execute_query("SELECT id, nom FROM races ORDER BY nom")

@app.get("/api/animaux/{animal_id}/cout-total")
def get_animal_cout_total(animal_id: int):
    result = execute_query("SELECT fn_cout_total_elevage(%s) as cout", [animal_id])
    return result[0] if result else {"cout": 0}

@app.post("/api/animaux/{animal_id}/rapport-nutritionnel")
def post_animal_rapport_nutritionnel(animal_id: int):
    return call_procedure("sp_rapport_nutritionnel", {"animal_id": animal_id})

@app.get("/api/animaux/{animal_id}/historique-statut")
def get_animal_historique(animal_id: int):
    return execute_query("SELECT * FROM historique_statut WHERE animal_id=%s ORDER BY date_changement DESC", [animal_id])

@app.get("/api/animaux/{animal_id}/pesees")
def get_animal_pesees(animal_id: int):
    return execute_query("SELECT * FROM pesees WHERE animal_id=%s ORDER BY date_pesee DESC", [animal_id])

@app.get("/api/sante")
def get_sante_globale():
    return execute_query("""
        SELECT s.*, a.numero_tag, a.nom as animal_nom 
        FROM sante s
        JOIN animaux a ON s.animal_id = a.id 
        ORDER BY s.date_acte DESC 
        LIMIT 50
    """)

@app.get("/api/alertes")
def get_alertes():
    return execute_query("""
        SELECT al.*, a.numero_tag, a.nom as animal_nom
        FROM alertes al
        LEFT JOIN animaux a ON al.animal_id = a.id
        WHERE al.traitee = FALSE
        ORDER BY al.niveau DESC, al.date_creation DESC
        LIMIT 50
    """)

@app.post("/api/alertes/{alert_id}/traiter")
def traiter_alerte(alert_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE alertes SET traitee=TRUE WHERE id=%s", (alert_id,))
    conn.commit()
    cursor.close(); conn.close()
    return {"success": True}

@app.get("/api/reproduction/en-cours")
def get_gestations():
    return execute_query("""
        SELECT r.*, a.numero_tag as mere_tag, a.nom as mere_nom,
               p.numero_tag as pere_tag,
               DATEDIFF(r.date_velage_prevue, CURDATE()) as jours_restants
        FROM reproduction r
        JOIN animaux a ON r.mere_id = a.id
        JOIN animaux p ON r.pere_id = p.id
        WHERE r.statut = 'en_gestation'
        ORDER BY r.date_velage_prevue ASC
    """)

# ── Endpoints Bonus ──────────────────────────────────────────

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch

import base64
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image as RLImage

class PDFPayload(BaseModel):
    charts: dict

@app.post("/api/reports/full/pdf")
def export_full_report_pdf(payload: PDFPayload):
    # 1. Collecte des données texte
    stats = execute_query("SELECT COUNT(*) as total, SUM(CASE WHEN sexe='F' THEN 1 ELSE 0 END) as femelles, SUM(CASE WHEN sexe='M' THEN 1 ELSE 0 END) as males FROM animaux WHERE statut='actif'")[0]
    gestations = execute_query("SELECT a.numero_tag, r.date_velage_prevue, DATEDIFF(r.date_velage_prevue, CURDATE()) as jours FROM reproduction r JOIN animaux a ON r.mere_id = a.id WHERE r.statut='en_gestation'")
    sante_rdv = execute_query("SELECT a.numero_tag, s.type, s.prochain_rdv FROM sante s JOIN animaux a ON s.animal_id = a.id WHERE s.prochain_rdv >= CURDATE() ORDER BY s.prochain_rdv ASC")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    elements = []
    styles = getSampleStyleSheet()
    
    # Styles
    header_style = ParagraphStyle('HeaderStyle', parent=styles['Heading1'], fontSize=26, textColor=colors.HexColor("#7c4f1e"), alignment=1)
    subtitle_style = ParagraphStyle('SubTitleStyle', parent=styles['Normal'], fontSize=12, textColor=colors.grey, alignment=1, spaceAfter=20)
    section_style = ParagraphStyle('SectionStyle', parent=styles['Heading2'], fontSize=16, textColor=colors.HexColor("#5a3a15"), spaceBefore=15, spaceAfter=10, backColor=colors.HexColor("#fdf6ec"), borderPadding=5)

    def get_image(base64_str, width=6.5*inch):
        if not base64_str: return None
        header, data = base64_str.split(',')
        img_data = base64.b64decode(data)
        img_buffer = BytesIO(img_data)
        return RLImage(img_buffer, width=width, height=width*0.5)

    # --- PAGE 1 : ANALYSE VISUELLE ---
    elements.append(Paragraph("BILAN D'EXPLOITATION BOVIBOT", header_style))
    elements.append(Paragraph(f"Rapport d'analyse dynamique — {datetime.now().strftime('%d/%m/%Y')}", subtitle_style))
    elements.append(Spacer(1, 0.4*inch))

    # Graphique Finance (Large)
    elements.append(Paragraph("1. Analyse de la Performance Financière", section_style))
    img_fin = get_image(payload.charts.get('finance'))
    if img_fin: elements.append(img_fin)
    elements.append(Spacer(1, 0.5*inch))

    # Graphique Race (Large)
    elements.append(Paragraph("2. Croissance par Race (GMQ Moyen)", section_style))
    img_race = get_image(payload.charts.get('race'))
    if img_race: elements.append(img_race)
    
    # --- PAGE 2 : SANTÉ & RÉPARTITION ---
    elements.append(PageBreak()) 
    elements.append(Paragraph("3. Analyse des Coûts Sanitaires", section_style))
    img_health = get_image(payload.charts.get('health'))
    if img_health: elements.append(img_health)
    elements.append(Spacer(1, 0.4*inch))

    elements.append(Paragraph("4. Structure Démographique", section_style))
    img_demo = get_image(payload.charts.get('demo'), width=4*inch)
    if img_demo: elements.append(img_demo)

    # --- PAGE 3 : TABLEAUX DÉTAILLÉS ---
    elements.append(PageBreak())
    
    # Style de tableau commun amélioré
    def get_table_style(main_color, light_color):
        return TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), main_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e9e2d9")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_color]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ])

    elements.append(Paragraph("5. Suivi Sanitaire & Rappels", section_style))
    if sante_rdv:
        s_data = [["TAG Animal", "Type d'intervention", "Date de rappel"]]
        for s in sante_rdv: 
            s_data.append([s['numero_tag'], s['type'].upper(), s['prochain_rdv'].strftime('%d/%m/%Y')])
        ts = Table(s_data, colWidths=[1.5*inch, 3*inch, 1.5*inch], repeatRows=1)
        ts.setStyle(get_table_style(colors.HexColor("#3b82f6"), colors.HexColor("#eff6ff")))
        elements.append(ts)
    else:
        elements.append(Paragraph("Aucun rappel sanitaire en attente.", styles['Normal']))

    elements.append(Spacer(1, 0.4*inch))
    elements.append(Paragraph("6. État des Gestations en cours", section_style))
    if gestations:
        g_data = [["Mère (Tag)", "Vêlage Prévu", "Échéance (Jours)"]]
        for g in gestations: 
            g_data.append([g['numero_tag'], g['date_velage_prevue'].strftime('%d/%m/%Y'), f"{g['jours']} j"])
        tg = Table(g_data, colWidths=[2*inch, 2*inch, 2*inch], repeatRows=1)
        tg.setStyle(get_table_style(colors.HexColor("#db2777"), colors.HexColor("#fdf2f8")))
        elements.append(tg)
    else:
        elements.append(Paragraph("Aucune gestation enregistrée actuellement.", styles['Normal']))

    elements.append(Spacer(1, 0.6*inch))
    elements.append(Paragraph("Fin du rapport d'exploitation — Généré par BoviBot AI", styles['Italic']))

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=bilan_visuel_bovibot.pdf"})



@app.get("/api/animaux/{animal_id}/genealogie")
def get_animal_genealogie(animal_id: int):
    # 1. L'animal et ses parents
    root = execute_query("""
        SELECT a.id, a.numero_tag, a.nom, a.sexe, a.mere_id, a.pere_id,
               m.numero_tag as mere_tag, m.nom as mere_nom, m.mere_id as grand_mere_mat_id, m.pere_id as grand_pere_mat_id,
               p.numero_tag as pere_tag, p.nom as pere_nom, p.mere_id as grand_mere_pat_id, p.pere_id as grand_pere_pat_id
        FROM animaux a
        LEFT JOIN animaux m ON a.mere_id = m.id
        LEFT JOIN animaux p ON a.pere_id = p.id
        WHERE a.id = %s
    """, [animal_id])
    
    if not root: return {"error": "Animal non trouvé"}
    animal = root[0]

    # 2. Grands-parents (Jointure pour les noms/tags)
    grand_parents = execute_query("""
        SELECT id, numero_tag, nom, sexe FROM animaux 
        WHERE id IN (%s, %s, %s, %s)
    """, [animal['grand_mere_mat_id'], animal['grand_pere_mat_id'], animal['grand_mere_pat_id'], animal['grand_pere_pat_id']])

    # 3. Enfants
    offspring = execute_query("""
        SELECT id, numero_tag, nom, sexe FROM animaux 
        WHERE mere_id = %s OR pere_id = %s
    """, [animal_id, animal_id])

    return {
        "animal": animal,
        "grand_parents": grand_parents,
        "offspring": offspring
    }

@app.get("/health")
def health():
    return {"status": "ok", "app": "BoviBot"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8002, reload=True)