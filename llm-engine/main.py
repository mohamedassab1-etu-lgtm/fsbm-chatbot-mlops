import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.chat_engine import get_chat_engine, ground_emails_in_answer

app = FastAPI(
    title="API Chatbot FSBM",
    description="API RAG pour interroger les données de la Faculté des Sciences Ben M'Sik",
    version="1.0.0"
)

# Configuration du CORS pour autoriser Next.js à communiquer avec l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, on mettra ["http://localhost:3000", "ton-domaine.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Chargement du modèle et de la base vectorielle...")
chat_engine = get_chat_engine()
print("Moteur IA prêt !")


class ChatRequest(BaseModel):
    question: str


def sse_event(data: dict) -> str:
    """Formats one Server-Sent-Event block. The frontend splits on '\\n\\n'
    and strips a leading 'data: ' prefix, then JSON.parses what's left -
    so every event MUST end with a blank line, and the payload MUST be a
    JSON object with 'type' and 'text' keys (event.type / event.text on
    the frontend)."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def generate_chat_stream(question: str):
    full_answer = ""
    context_docs = None
    try:
        # chat_engine.stream() yields partial dicts as the chain runs;
        # only some of them carry an "answer" key (retrieval/context
        # chunks don't). We forward each answer piece as a 'delta' event,
        # matching what ensureBotMessage() on the frontend appends.
        for chunk in chat_engine.stream({"input": question}):
            if "context" in chunk:
                context_docs = chunk["context"]

            piece = chunk.get("answer")
            if piece:
                full_answer += piece
                yield sse_event({"type": "delta", "text": piece})

        # Email-grounding needs the finished answer, not partial tokens -
        # run it once here on the full text, then let the frontend swap
        # in the corrected version (replaceBotMessage) via 'done'.
        grounded_answer = ground_emails_in_answer(full_answer, context_docs, question)
        yield sse_event({"type": "done", "text": grounded_answer})

    except Exception as e:
        yield sse_event({"type": "error", "text": str(e)})


@app.post("/api/chat", tags=["Chat"])
async def chat_endpoint(request: ChatRequest):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="La question ne peut pas être vide.")

    return StreamingResponse(
        generate_chat_stream(request.question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            # Disables buffering on nginx-style proxies sitting in front of
            # uvicorn, so chunks reach the browser as they're produced.
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health", tags=["Système"])
async def health_check():
    return {"status": "L'API FSBM est opérationnelle"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)