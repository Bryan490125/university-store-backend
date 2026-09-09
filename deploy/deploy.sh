#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose pull
docker compose build --pull
docker compose up -d
docker compose exec -T api npx prisma migrate deploy
docker compose ps
