Write-Host "`n=== 1. Wiping old environment ===" -ForegroundColor Cyan
docker compose down -v

Write-Host "`n=== 2. Building fresh images ===" -ForegroundColor Cyan
docker compose build --no-cache

Write-Host "`n=== 3. Starting Database and Ollama ===" -ForegroundColor Cyan
docker compose up -d db ollama

Write-Host "`n=== 4. Waiting for Ollama to boot... ===" -ForegroundColor Cyan
do {
    Start-Sleep -Seconds 3
    $null = docker exec fsbm-ollama ollama list 2>&1
} until ($LASTEXITCODE -eq 0)

Write-Host "Ollama is online! Pulling qwen2.5:3b model..." -ForegroundColor Green
docker exec fsbm-ollama ollama pull qwen2.5:3b

Write-Host "`n=== 5. Starting Dagster ===" -ForegroundColor Cyan
docker compose up -d dagster
Write-Host "Waiting 10 seconds for Dagster to initialize..."
Start-Sleep -Seconds 10

Write-Host "`n=== 6. Generating DuckDB Database ===" -ForegroundColor Cyan
docker exec fsbm-dagster mkdir -p /app/data/duckdb
docker exec fsbm-dagster dagster asset materialize -f orchestration.py --select "*"

Write-Host "`n=== 7. Starting Backend and Frontend ===" -ForegroundColor Cyan
docker compose up -d backend frontend

Write-Host "`n=== 8. Streaming Backend Logs (Ctrl+C to exit logs) ===" -ForegroundColor Green
docker logs -f fsbm-backend