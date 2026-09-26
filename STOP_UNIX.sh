#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
PIDFILE=.runtime/vite.pid
if [[ ! -f "$PIDFILE" ]]; then
  echo "No recorded local server is running."
  exit 0
fi
pid="$(cat "$PIDFILE")"
if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
  rm -f "$PIDFILE"
  echo "Invalid PID file removed; no process was killed."
  exit 0
fi
if ! kill -0 "$pid" 2>/dev/null; then
  rm -f "$PIDFILE"
  echo "Recorded server was already stopped; PID file removed."
  exit 0
fi
command_line="$(ps -p "$pid" -o command= 2>/dev/null || true)"
if [[ "$command_line" != *vite* ]]; then
  rm -f "$PIDFILE"
  echo "PID $pid no longer looks like the package Vite process; PID file removed without killing it."
  exit 0
fi
kill "$pid" || true
rm -f "$PIDFILE"
echo "Local server stopped."
