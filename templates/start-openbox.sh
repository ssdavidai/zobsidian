#!/bin/bash
# zobsidian — openbox window manager
set -e

export DISPLAY=__DISPLAY__

# Wait for Xvfb to be ready
for i in $(seq 1 30); do
  if xdpyinfo -display ${DISPLAY} >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

exec openbox-session
