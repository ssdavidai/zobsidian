#!/bin/bash
# zobsidian — Xvfb virtual framebuffer
set -e

DISPLAY=__DISPLAY__
DISPLAY_NUM="${DISPLAY#:}"

# Clean up stale lock files
rm -f /tmp/.X${DISPLAY_NUM}-lock /tmp/.X11-unix/X${DISPLAY_NUM}

exec Xvfb ${DISPLAY} -screen 0 1920x1080x24 -ac +extension GLX +render -noreset
