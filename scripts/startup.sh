#!/usr/bin/env bash
# Local stack: Postgres, SOC API, Vite, and Phoenix.
#
# There was no startup script. Those four processes were started by hand,
# and the OpenRouter key was written only from the assistant settings screen.
# This script asks for the key first and saves it in the project .env file,
# then starts anything that is not already listening.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs"
PID_FILE="$LOG_DIR/soc.pids"
PYTHON="/tmp/soc-api-venv/bin/python"

mkdir -p "$LOG_DIR"
touch "$PID_FILE"

listening() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

prompt_openrouter_key() {
  local has_key="no"
  if (
    cd "$ROOT/backend"
    "$PYTHON" -c 'from model_router import load_openrouter_key; raise SystemExit(0 if load_openrouter_key() else 1)'
  ); then
    has_key="yes"
  fi

  if [[ ! -r /dev/tty ]]; then
    if [[ "$has_key" == "yes" ]]; then
      echo "Using the OpenRouter key already saved in .env."
      return
    fi
    echo "No OpenRouter key is saved in .env, and this shell has no terminal to ask for one." >&2
    exit 1
  fi

  echo "OpenRouter API key"
  if [[ "$has_key" == "yes" ]]; then
    echo "A key is already saved in .env."
    echo "Press Enter to keep it, or paste a new key. The paste is hidden."
  else
    echo "Paste your OpenRouter API key. It will be saved in .env. The paste is hidden."
  fi

  local key=""
  IFS= read -r -s key < /dev/tty || true
  echo
  if [[ -z "$key" ]]; then
    if [[ "$has_key" == "yes" ]]; then
      echo "Kept the OpenRouter key already saved in .env."
      return
    fi
    echo "An OpenRouter key is required." >&2
    exit 1
  fi

  printf '%s' "$key" | (
    cd "$ROOT/backend"
    "$PYTHON" -c 'import sys; from model_router import save_openrouter_key; save_openrouter_key(sys.stdin.read())'
  )
  echo "Saved the OpenRouter key in .env."
}

wait_for_port() {
  local port="$1"
  local label="$2"
  local attempt
  for attempt in $(seq 1 90); do
    if listening "$port"; then
      echo "$label is listening on port $port."
      return 0
    fi
    sleep 0.5
  done
  echo "$label did not open port $port. See $LOG_DIR." >&2
  return 1
}

start_postgres() {
  if listening 5433; then
    echo "Postgres is already listening on port 5433."
    return
  fi
  echo "Starting Postgres."
  docker compose -f "$ROOT/backend/docker-compose.yml" up -d
  local attempt
  for attempt in $(seq 1 60); do
    if docker exec soc-postgres pg_isready -U soc -d soc_ai >/dev/null 2>&1; then
      echo "Postgres is ready."
      echo "postgres" >> "$LOG_DIR/soc.started-here"
      return
    fi
    sleep 0.5
  done
  echo "Postgres did not become ready." >&2
  exit 1
}

start_background() {
  local name="$1"
  local workdir="$2"
  shift 2
  # Double-fork so the process leaves this terminal. Vite resets SIGHUP, so nohup
  # is not enough: closing the startup shell was taking the dev server with it.
  "$PYTHON" - "$name" "$workdir" "$LOG_DIR" "$PID_FILE" "$@" <<'PY'
import os
import sys

name, workdir, log_dir, pid_file = sys.argv[1:5]
argv = sys.argv[5:]
if os.fork() > 0:
    raise SystemExit(0)
os.setsid()
grandchild = os.fork()
if grandchild > 0:
    with open(pid_file, "a", encoding="utf-8") as handle:
        handle.write(str(grandchild) + "\n")
    raise SystemExit(0)
os.chdir(workdir)
log = os.open(
    os.path.join(log_dir, name + ".log"),
    os.O_WRONLY | os.O_CREAT | os.O_APPEND,
    0o644,
)
os.dup2(log, 1)
os.dup2(log, 2)
os.execvp(argv[0], argv)
PY
}

start_api() {
  if listening 8000; then
    echo "SOC API is already listening on port 8000."
    return
  fi
  echo "Starting the SOC API."
  PYTHONUNBUFFERED=1 start_background api "$ROOT/backend" "$PYTHON" server.py
  wait_for_port 8000 "SOC API"
}

start_vite() {
  if listening 8080; then
    echo "Vite is already listening on port 8080."
    return
  fi
  echo "Starting Vite."
  # Run the Vite binary itself. npm would exit when this script exits and take the server with it.
  start_background vite "$ROOT" "$ROOT/node_modules/.bin/vite" --host 127.0.0.1 --port 8080
  wait_for_port 8080 "Vite"
}

start_phoenix() {
  if listening 6006; then
    echo "Phoenix is already listening on port 6006."
    return
  fi
  echo "Starting Phoenix."
  PHOENIX_HOST=127.0.0.1 PHOENIX_PORT=6006 \
    start_background phoenix "$ROOT" "$PYTHON" -m phoenix.server.main serve
  wait_for_port 6006 "Phoenix"
}

if [[ ! -x "$PYTHON" ]]; then
  echo "Missing the API virtualenv at $PYTHON." >&2
  exit 1
fi

prompt_openrouter_key
start_postgres
start_api
start_vite
start_phoenix

echo "Ready. App http://127.0.0.1:8080  API http://127.0.0.1:8000  Phoenix http://127.0.0.1:6006"
