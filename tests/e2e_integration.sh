#!/bin/bash
set -e

echo "1. Checking Next.js Frontend Route..."
curl --fail --retry 5 --retry-connrefused --retry-delay 3 http://localhost:3000

echo "2. Checking Loki & Tempo Readiness..."
curl --fail --retry 5 --retry-connrefused --retry-delay 3 http://localhost:3100/ready
curl --fail --retry 5 --retry-connrefused --retry-delay 3 http://localhost:3200/ready

echo "3. Checking Prometheus Custom Metric..."
curl --fail --silent http://localhost:8000/metrics | grep "llm_tokens_generated_total"