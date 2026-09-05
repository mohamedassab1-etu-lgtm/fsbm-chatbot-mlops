import json
import time
import sys
from pathlib import Path

# Importer la fonction pour initialiser le LLM depuis ton fichier chat_engine
from src.chat_engine import get_chat_engine

def run_evaluation(questions_file="test_questions.json", output_file="benchmark_results.json"):
    questions_path = Path(questions_file)
    if not questions_path.exists():
        print(f"Erreur : Le fichier {questions_file} est introuvable.")
        sys.exit(1)

    # Charger les questions
    with open(questions_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("\n" + "="*50)
    print("🧠 INITIALISATION DU MOTEUR LLM...")
    print("="*50)
    start_init = time.time()
    bot = get_chat_engine()
    print(f"✅ Moteur prêt en {time.time() - start_init:.2f} secondes.\n")

    results_to_export = {}

    # Parcourir chaque catégorie (1 fichier, 2 fichiers, 3 fichiers)
    for category, questions in data.items():
        print(f"\n\n🚀 DÉMARRAGE DU TEST : {category.upper()} ({len(questions)} questions)")
        print("="*70)
        
        category_results = []

        for q in questions:
            q_id = q["id"]
            question_text = q["question"]

            print(f"\n▶ QUESTION [{q_id}] :")
            print(f"{question_text}")
            
            # Démarrer le chrono
            t0 = time.time()
            
            try:
                # Interroger l'IA
                response = bot.invoke({"input": question_text})
                answer = response.get("answer", response.get("result", "Aucune réponse trouvée"))
            except Exception as e:
                answer = f"ERREUR TECHNIQUE : {str(e)}"
            
            # Arrêter le chrono
            elapsed = time.time() - t0

            print(f"\n🤖 RÉPONSE IA ({elapsed:.2f}s) :")
            print(f"{answer}")
            print("-" * 70)

            # Stocker les résultats pour le fichier JSON
            category_results.append({
                "id_question": q_id,
                "question": question_text,
                "temps_reponse_secondes": round(elapsed, 2),
                "reponse_ia": answer
            })

        results_to_export[category] = category_results

    # Sauvegarder tout dans un fichier JSON final
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results_to_export, f, ensure_ascii=False, indent=4)

    print("\n" + "="*50)
    print(f"🏁 BENCHMARK TERMINÉ ! ")
    print(f"📁 Tous les résultats ont été sauvegardés dans : {output_file}")
    print("="*50)

if __name__ == "__main__":
    run_evaluation()