#!/bin/bash
# zobsidian — Install all dependencies
set -e

echo "Updating package lists..."
apt-get update -qq

echo "Installing Xvfb, openbox, x11vnc, noVNC, websockify, and X11 utilities..."
apt-get install -y -qq \
  xvfb \
  openbox \
  x11vnc \
  novnc \
  websockify \
  x11-utils \
  x11-xserver-utils \
  libnotify4 \
  libnss3 \
  libxss1 \
  libsecret-1-0 \
  libgbm1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libdrm2 \
  netcat-openbsd \
  wget \
  2>/dev/null

# Install Obsidian if not present
if ! command -v obsidian >/dev/null 2>&1 && [ ! -x /usr/bin/obsidian ] && [ ! -x /opt/Obsidian/obsidian ]; then
  echo "Installing Obsidian..."

  # Get latest Obsidian .deb URL
  OBSIDIAN_VERSION=$(wget -qO- "https://api.github.com/repos/obsidianmd/obsidian-releases/releases/latest" | grep -oP '"tag_name":\s*"v?\K[^"]+')

  if [ -z "$OBSIDIAN_VERSION" ]; then
    echo "Could not determine latest Obsidian version, using 1.8.9"
    OBSIDIAN_VERSION="1.8.9"
  fi

  OBSIDIAN_DEB="/tmp/obsidian_${OBSIDIAN_VERSION}_amd64.deb"
  wget -q "https://github.com/obsidianmd/obsidian-releases/releases/download/v${OBSIDIAN_VERSION}/obsidian_${OBSIDIAN_VERSION}_amd64.deb" -O "$OBSIDIAN_DEB"
  dpkg -i "$OBSIDIAN_DEB" || apt-get install -f -y -qq
  rm -f "$OBSIDIAN_DEB"

  # Save installed version for recovery
  mkdir -p /root/.zobsidian
  echo "$OBSIDIAN_VERSION" > /root/.zobsidian/obsidian-version

  echo "Obsidian ${OBSIDIAN_VERSION} installed"
else
  echo "Obsidian already installed"
fi

echo "All dependencies installed."
