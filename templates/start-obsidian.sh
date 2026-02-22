#!/bin/bash
# zobsidian — Obsidian on virtual display
set -e

export DISPLAY=__DISPLAY__

# Wait for Xvfb + openbox to be ready
for i in $(seq 1 30); do
  if xdpyinfo -display ${DISPLAY} >/dev/null 2>&1; then
    # Check if window manager is running
    if pgrep -x openbox >/dev/null 2>&1; then
      break
    fi
  fi
  sleep 1
done

# Create vault directory if needed
mkdir -p "__VAULT_PATH__"

exec obsidian --no-sandbox --disable-gpu "__VAULT_PATH__"
