#!/bin/bash
# zobsidian — x11vnc server
set -e

source /root/.zo_secrets

export DISPLAY=__DISPLAY__

# Wait for Xvfb to be ready
for i in $(seq 1 30); do
  if xdpyinfo -display ${DISPLAY} >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

exec x11vnc -display ${DISPLAY} -rfbport __VNC_PORT__ -passwd "${ZOBSIDIAN_VNC_PASSWORD}" -shared -forever -noxdamage
