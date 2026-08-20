import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.chat_engine import get_chat_engine, get_grounded_answer, ground_emails_in_answer

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

class ChatResponse(BaseModel):
    reponse: str

@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_endpoint(request: ChatRequest):
    """Non-streaming endpoint: waits for the full answer, grounds it,
    and returns it in one JSON response. Kept for callers that don't
    need live typing (scripts, health checks, simple integrations)."""
    try:
        response = get_grounded_answer(chat_engine, request.question)
        return ChatResponse(reponse=response["answer"])

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _sse_event(event_type: str, text: str) -> str:
    """Formats one Server-Sent Event. Payload is JSON-encoded so that
    newlines or special characters inside the answer text can't break
    the SSE framing (which relies on blank-line-terminated messages)."""
    payload = json.dumps({"type": event_type, "text": text}, ensure_ascii=False)
    return f"data: {payload}\n\n"


def _stream_answer(question: str):
    """Generator driving the SSE response: streams each answer token as
    it's generated (raw, ungrounded - for live-typing responsiveness),
    then emits one final 'done' event carrying the grounded/corrected
    full answer. The frontend should append 'delta' events to the
    displayed message as they arrive, then REPLACE the displayed text
    entirely with the 'done' event's text once it arrives - this way the
    user sees live typing, but the text they're left with is always the
    verified-correct version, even in the rare case grounding changes
    something the model streamed differently."""
    accumulated_answer = ""
    context_docs = None

    try:
        for chunk in chat_engine.stream({"input": question}):
            if "context" in chunk and context_docs is None:
                context_docs = chunk["context"]
            if "answer" in chunk and chunk["answer"]:
                accumulated_answer += chunk["answer"]
                yield _sse_event("delta", chunk["answer"])

        final_answer = ground_emails_in_answer(accumulated_answer, context_docs, question)
        yield _sse_event("done", final_answer)

    except Exception as e:
        yield _sse_event("error", str(e))


@app.post("/api/chat/stream", tags=["Chat"])
async def chat_stream_endpoint(request: ChatRequest):
    """Streaming endpoint: emits the answer live, token by token, via
    Server-Sent Events. Use this for the website's chat UI."""
    return StreamingResponse(
        _stream_answer(request.question),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disables nginx response buffering, if you're behind one
        },
    )


@app.get("/api/health", tags=["Système"])
async def health_check():
    return {"status": "L'API FSBM est opérationnelle"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)