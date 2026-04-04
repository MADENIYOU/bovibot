import httpx
import json
import asyncio
import sys

# URL de l'API BoviBot lancée via Docker Compose
API_URL = "http://localhost:8002/api/chat"

CAS_TESTS = [
    "Liste tous les animaux actifs avec leur âge et GMQ",
    "Quels animaux ont un GMQ inférieur à 0.3 kg/jour ?",
    "Quelles femelles vêlent dans les 30 prochains jours ?",
    "Enregistre une pesée de 325 kg pour TAG-001 aujourd'hui",
    "Déclare la vente de TAG-003 à Oumar Ba pour 280 000 FCFA"
]

async def run_test_cases():
    print(f"=== BoviBot — Test des 5 Cas d'Usage (LLM) ===\n")
    print(f"Cible : {API_URL}\n")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, question in enumerate(CAS_TESTS, 1):
            print(f"🔹 CAS {i}: \"{question}\"")
            
            try:
                response = await client.post(
                    API_URL, 
                    json={"question": question, "history": []}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Affichage formaté du JSON retourné par l'IA
                    print(f"✅ Réponse reçue :")
                    print(json.dumps(data, indent=4, ensure_ascii=False))
                    
                    # Vérification basique du type de réponse
                    expected_type = "query" if i <= 3 else "action"
                    # Note: le cas 4/5 peut retourner 'info' si l'ID n'est pas résolu automatiquement
                    actual_type = data.get("type")
                    print(f"ℹ️  Type : {actual_type} (Attendu: {expected_type} ou info)")
                    
                else:
                    print(f"❌ Erreur HTTP {response.status_code} : {response.text}")
                    
            except Exception as e:
                print(f"❌ Erreur de connexion : {str(e)}")
            
            print("-" * 50 + "\n")

if __name__ == "__main__":
    try:
        asyncio.run(run_test_cases())
    except KeyboardInterrupt:
        print("\nTest interrompu.")
        sys.exit(0)
