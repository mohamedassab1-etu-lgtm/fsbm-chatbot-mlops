import requests
import concurrent.futures
import random
import time

URL = "http://localhost:8000/api/chat/stream" # Using your streaming endpoint
QUESTIONS = [
    "qui est le chef du master big data and data science ?",
    "donne moi les laboratoires de recherche de la fsbm",
    "quel est l'emploi du temps de la section SMPC ?",
    "qui est le doyen de la faculté ?",
    "comment contacter Pr. Mohssine Bentaib ?"
]

def send_query(query_id):
    question = random.choice(QUESTIONS)
    print(f"[User {query_id}] Asking: {question}")
    try:
        # Stream the response to keep the connection open like a real user
        with requests.post(URL, json={"question": question}, stream=True, timeout=180) as r:
            for chunk in r.iter_content(chunk_size=1024):
                pass
        return f"[User {query_id}] Success"
    except Exception as e:
        return f"[User {query_id}] Failed: {e}"

print("Initiating FSBM Chatbot Load Test...")
# Simulate 10 concurrent users sending 30 total questions
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    futures = [executor.submit(send_query, i) for i in range(1, 31)]
    for future in concurrent.futures.as_completed(futures):
        print(future.result())