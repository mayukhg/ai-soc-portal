#!/usr/bin/env bash
# Stop the processes scripts/startup.sh launched.
#
# Listeners on 8000, 8080, and 6006 are stopped when the command line is the
# SOC API, Vite, or Phoenix, including a stack that was started by hand.
# Postgres is stopped only when this checkout's startup script started it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs"
PID_FILE="$LOG_DIR/soc.pids"
STARTED_HERE="$LOG_DIR/soc.started-here"

stop_pid() {
  local pid="$1"
  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return
  fi
  kill "$pid" 2>/dev/null || true
  local attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if ! kill -0 "$pid" 2>/dev/null; then
      return
    fi
    sleep 0.3
  done
  kill -9 "$pid" 2>/dev/null || true
}

stop_recorded_pids() {
  if [[ ! -f "$PID_FILE" ]]; then
    return
  fi
  local pid
  while IFS= read -r pid; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    stop_pid "$pid"
  done < "$PID_FILE"
  rm -f "$PID_FILE"
}

listener_pid() {
  lsof -nP -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1
}

command_of() {
  ps -p "$1" -o command= 2>/dev/null || true
}

stop_known_listeners() {
  local port pid command
  for port in 8000 8080 6006; do
    pid="$(listener_pid "$port" || true)"
    [[ -n "$pid" ]] || continue
    command="$(command_of "$pid")"
    case "$command" in
      *server.py*|*vite*|*phoenix*)
        echo "Stopping port $port ($pid)."
        stop_pid "$pid"
        ;;
      *)
        echo "Leaving port $port alone. The listener is not the SOC stack."
        ;;
    esac
  done
}

stop_postgres_if_we_started_it() {
  if [[ ! -f "$STARTED_HERE" ]] || ! grep -qx "postgres" "$STARTED_HERE"; then
    echo "Leaving Postgres running."
    return
  fi
  echo "Stopping Postgres."
  docker compose -f "$ROOT/backend/docker-compose.yml" stop
  rm -f "$STARTED_HERE"
}

stop_recorded_pids
stop_known_listeners
stop_postgres_if_we_started_it
echo "Shutdown complete."
