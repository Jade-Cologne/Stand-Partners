#!/usr/bin/env bash
# Local dev startup — runs backend and frontend concurrently.
# Usage: ./dev.sh
# Stop with Ctrl+C (kills both processes).

set -e
cd "$(dirname "$0")"

# Verify DB is reachable
if ! psql postgresql://standpartners:standpartners@localhost:5432/standpartners -c "SELECT 1" > /dev/null 2>&1; then
  echo "ERROR: Cannot connect to local PostgreSQL. Is it running?"
  echo "  sudo systemctl start postgresql"
  exit 1
fi

# Backend
(
  cd backend
  .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

# Frontend
(
  cd frontend
  npm run dev -- --host
) &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "  Ctrl+C to stop both."
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
