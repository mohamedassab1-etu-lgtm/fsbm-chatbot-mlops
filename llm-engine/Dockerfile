FROM python:3.11-slim

WORKDIR /app

# Copy and install requirements first to leverage Docker layer caching
COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Copy the remaining application code
COPY . .

EXPOSE 8000

# Execute the FastAPI server
CMD ["bash", "-c", "python -m src.vectorstore && uvicorn main:app --host 0.0.0.0 --port 8000"]