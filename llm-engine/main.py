from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from src.chat_engine import get_chat_engine

app = FastAPI(
    title="API Chatbot FSBM",
    description="API RAG pour interroger les données de la Faculté des Sciences Ben M'Sik",
    version="1.0.0"
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
    try:
        response = chat_engine.invoke({"input": request.question})
        
        return ChatResponse(reponse=response["answer"])
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health", tags=["Système"])
async def health_check():
    return {"status": "L'API FSBM est opérationnelle"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)