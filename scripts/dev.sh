#!/usr/bin/env bash
#
# Start both halves of GlowMatch for local development.
#
# Exists because the failure it prevents is silent and confusing: if the backend
# is stale or not running, the frontend still loads and looks fine — the quiz
# page just shows "couldn't load the quiz" and recommendation cards come back
# empty. Nothing points at the backend.
#
#   ./scripts/dev.sh          both halves
#   ./scripts/dev.sh backend  API only
#   ./scripts/dev.sh frontend web only
#
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)

API_PORT=${API_PORT:-8000}
WEB_PORT=${WEB_PORT:-3000}
REQUIRED_PY=3.11

fail() { printf '\033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!\033[0m %s\n' "$1"; }

check_backend() {
  [ -x backend/.venv/bin/python ] || fail \
"backend/.venv missing. Create it on Python $REQUIRED_PY:

    cd backend
    python$REQUIRED_PY -m venv .venv
    .venv/bin/pip install -r requirements.txt"

  local version
  version=$(backend/.venv/bin/python -c 'import sys; print("%d.%d" % sys.version_info[:2])')
  # Not a style preference: api/routes.py uses PEP 604 unions evaluated at
  # import time, so anything below 3.10 cannot start the server at all.
  case "$version" in
    3.1[0-9]) ok "backend venv is Python $version" ;;
    *) fail "backend venv is Python $version, but the API needs >= 3.10 (runtime.txt pins $REQUIRED_PY).
Rebuild it:  rm -rf backend/.venv && cd backend && python$REQUIRED_PY -m venv .venv && .venv/bin/pip install -r requirements.txt" ;;
  esac

  if [ -f backend/.env ] && grep -q '^ANTHROPIC_API_KEY=.\+' backend/.env; then
    ok "ANTHROPIC_API_KEY found in backend/.env"
  elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    ok "ANTHROPIC_API_KEY found in the environment"
  else
    warn "No ANTHROPIC_API_KEY. Shade matching still works; product recommendations
  and the quiz routine will come back empty. Copy backend/.env.example to
  backend/.env and add your key."
  fi
}

check_frontend() {
  [ -d frontend/node_modules ] || fail "frontend/node_modules missing. Run: cd frontend && npm install"
  if [ -f frontend/.env.local ]; then
    ok "frontend/.env.local present"
  else
    warn "No frontend/.env.local — NEXT_PUBLIC_API_URL defaults to http://localhost:8000"
  fi
}

start_backend() {
  echo "→ API   http://localhost:$API_PORT"
  (cd backend && exec .venv/bin/uvicorn main:app --reload --port "$API_PORT")
}

start_frontend() {
  echo "→ Web   http://localhost:$WEB_PORT"
  (cd frontend && exec npm run dev -- -p "$WEB_PORT")
}

case "${1:-both}" in
  backend)  check_backend;  start_backend ;;
  frontend) check_frontend; start_frontend ;;
  both)
    check_backend
    check_frontend
    echo
    start_backend & BACK=$!
    start_frontend & FRONT=$!
    # Either half dying should take the other with it, so you never end up
    # debugging a frontend whose API quietly exited.
    trap 'kill $BACK $FRONT 2>/dev/null' INT TERM EXIT
    wait -n "$BACK" "$FRONT"
    ;;
  *) fail "usage: $0 [both|backend|frontend]" ;;
esac
