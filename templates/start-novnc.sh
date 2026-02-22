#!/bin/bash
# zobsidian — noVNC web client (websockify)
set -e

# Wait for VNC to be ready
for i in $(seq 1 30); do
  if nc -z 127.0.0.1 __VNC_PORT__ 2>/dev/null; then
    break
  fi
  sleep 1
done

# Find noVNC web directory
NOVNC_DIR=""
for dir in /usr/share/novnc /usr/share/noVNC /opt/noVNC; do
  if [ -d "$dir" ]; then
    NOVNC_DIR="$dir"
    break
  fi
done

if [ -z "$NOVNC_DIR" ]; then
  echo "ERROR: noVNC web directory not found"
  exit 1
fi

exec websockify --web="$NOVNC_DIR" __NOVNC_PORT__ localhost:__VNC_PORT__
