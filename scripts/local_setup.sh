#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env. Replace JWT_SECRET and EXPOSED_PEER_API_KEY before production."
fi

docker compose up -d --build
echo "Waiting for the API..."
for _ in {1..30}; do
  if curl -fsS http://localhost:3000/store/api/health >/dev/null; then
    echo "Ready: http://localhost:3000/store/api/docs"
    exit 0
  fi
  sleep 2
done

docker compose logs api
echo "API did not become ready." >&2
exit 1
