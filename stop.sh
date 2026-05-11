#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.proxy.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "Proxy is not running"
  exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  rm "$PID_FILE"
  echo "Proxy stopped"
else
  rm "$PID_FILE"
  echo "Proxy was not running (stale PID file removed)"
fi
