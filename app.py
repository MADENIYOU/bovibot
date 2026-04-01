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
  (Note : numero_tag est l'identifiant unique visible (ex: TAG-001). race_id -> races.id)
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

# ── Connexion MySQL ─────────────────────────────────────────────
def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def execute_query(sql: str, params: list = None):
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
    }
    for k, sql in queries.items():
        result = execute_query(sql)
        stats[k] = result[0]["n"] if result else 0
    return stats

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

@app.get("/health")
def health():
    return {"status": "ok", "app": "BoviBot"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8002, reload=True)
