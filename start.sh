#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.proxy.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Proxy already running (PID $(cat "$PID_FILE"))"
  exit 0
fi

mitmdump -s "$SCRIPT_DIR/addon.py" --listen-port 8080 --quiet \
  > "$SCRIPT_DIR/proxy.log" 2>&1 &

echo $! > "$PID_FILE"
echo "Proxy started (PID $!)"
echo "Logs: $SCRIPT_DIR/proxy.log"
