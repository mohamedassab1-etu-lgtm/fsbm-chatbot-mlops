#!/bin/bash
set -e

echo "1. Checking Next.js Frontend Route..."
curl --fail --retry 5 --retry-connrefused --retry-delay 3 http://localhost:3000

echo "2. Checking Loki & Tempo Readiness..."
curl --fail --retry 5 --retry-connrefused --retry-delay 3 http://localhost:3100/ready
curl --fail --retry 5 --retry-connrefused --retry-delay 3 http://localhost:3200/ready

echo "3. Checking Prometheus Custom Metric..."
curl --fail --silent http://localhost:8000/metrics | grep "llm_tokens_generated_total"

echo "4. Simulating E2E Chat Stream..."
HTTP_STATUS=$(curl -s -o stream.txt -w "%{http_code}" -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"question": "Quels sont les départements de la FSBM ?"}')

if [ "$HTTP_STATUS" -ne 200 ] || ! grep -q "data:" stream.txt; then
  echo "E2E Test Failed!"
  cat stream.txt
  exit 1
fi
echo "E2E Chat Stream passed successfully!"