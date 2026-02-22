# zobsidian

Run [Obsidian](https://obsidian.md) headlessly on your [Zo Computer](https://zo.computer) workspace with **Obsidian Sync** running continuously in the background. Access the GUI via VNC or browser (noVNC) for initial setup, then let Sync do its thing.

## Why?

Obsidian Sync needs the app running to sync. This package runs Obsidian on a virtual display (Xvfb) managed by supervisord, so it auto-starts, auto-restarts, and keeps your vault synced 24/7 — even when you're not connected.

## Quickstart

```bash
npx @ssdavidai/zobsidian setup
```

You'll be prompted for:

1. **Display** — virtual display number (default: `:5`)
2. **VNC port** — for native VNC clients (default: `5900`)
3. **noVNC port** — for browser access (default: `6080`)
4. **Vault path** — where your vault lives (default: `/home/workspace/obsidian-vault/`)
5. **VNC password** — for securing VNC access

After setup, connect via browser to sign into Obsidian and enable Sync:

```bash
# From your local machine
ssh -L 6080:localhost:6080 <your-zo-host>
# Then open http://localhost:6080/vnc.html
```

## Commands

### `zobsidian setup`

Interactive setup: installs dependencies, configures virtual display, starts all 5 services.

### `zobsidian status`

Shows health of all services:

```
  zobsidian status

  [+] zobsidian-xvfb         zobsidian-xvfb                   RUNNING   pid 1234, uptime 2:30:00
  [+] zobsidian-openbox       zobsidian-openbox                RUNNING   pid 1235, uptime 2:30:00
  [+] zobsidian-x11vnc        zobsidian-x11vnc                 RUNNING   pid 1236, uptime 2:30:00
  [+] zobsidian-novnc         zobsidian-novnc                  RUNNING   pid 1237, uptime 2:30:00
  [+] zobsidian               zobsidian                        RUNNING   pid 1238, uptime 2:30:00

  All 5 services are running.
```

### `zobsidian vnc`

Shows VNC/noVNC connection info and instructions.

### `zobsidian teardown`

Stops all services, removes supervisor config, cleans up secrets and scripts.

## Architecture

5 supervisord programs, started in priority order:

| Priority | Program | Description |
|----------|---------|-------------|
| 100 | `zobsidian-xvfb` | Virtual framebuffer (display :5, 1920x1080) |
| 200 | `zobsidian-openbox` | Window manager |
| 300 | `zobsidian-x11vnc` | VNC server (port 5900) |
| 350 | `zobsidian-novnc` | noVNC web client (port 6080) |
| 400 | `zobsidian` | Obsidian app |

## First-Time Setup

1. Run `zobsidian setup`
2. Connect to noVNC via SSH tunnel
3. Sign into your Obsidian account
4. Enable Obsidian Sync and select your vault
5. Disconnect — Sync continues in the background

## Requirements

- A Zo Computer workspace
- An Obsidian account with Sync
- Node.js (pre-installed on Zo)
