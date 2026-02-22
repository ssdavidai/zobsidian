# zobsidian

Run [Obsidian](https://obsidian.md) headlessly on your [Zo Computer](https://zo.computer) workspace with **Obsidian Sync** running continuously in the background. Access the GUI via VNC or browser (noVNC) for initial setup, then let Sync do its thing.

## Why Obsidian on Zo?

Obsidian Sync needs the app running to sync. On a normal machine, that means keeping a window open. With zobsidian, Obsidian runs on a virtual display managed by supervisord — it auto-starts, auto-restarts, and keeps your vault synced 24/7, even when you're not connected.

- **Always-on Sync** — your vault stays current without leaving a laptop open
- **Access from anywhere** — connect via browser (noVNC) or any VNC client for GUI access
- **Survives reboots** — supervisord restarts all 5 services automatically
- **Zero desktop needed** — runs entirely headless on a virtual framebuffer

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

Once setup completes, all 5 services start and Obsidian is running on the virtual display.

## First-Time Sync Setup

After `zobsidian setup`, you need to sign into Obsidian once via VNC:

```bash
# From your local machine, create an SSH tunnel
ssh -L 6080:localhost:6080 <your-zo-host>

# Then open in your browser
# http://localhost:6080/vnc.html
```

In the VNC session:

1. Sign into your Obsidian account
2. Enable Obsidian Sync and select your vault
3. Close the browser tab — Sync continues in the background

That's it. You never need to connect again unless you want to change Sync settings.

## Commands

### `zobsidian setup`

Interactive setup. Installs all dependencies (Xvfb, openbox, x11vnc, noVNC, Obsidian), configures the virtual display, and starts all 5 supervisor services.

```bash
npx @ssdavidai/zobsidian setup
```

### `zobsidian status`

Shows health of all 5 services:

```bash
npx @ssdavidai/zobsidian status
```

```
  zobsidian status

  [+] zobsidian-xvfb           RUNNING   pid 1234, uptime 2:30:00
  [+] zobsidian-openbox         RUNNING   pid 1235, uptime 2:30:00
  [+] zobsidian-x11vnc          RUNNING   pid 1236, uptime 2:30:00
  [+] zobsidian-novnc           RUNNING   pid 1237, uptime 2:30:00
  [+] zobsidian                  RUNNING   pid 1238, uptime 2:30:00

  All 5 services are running.
```

### `zobsidian vnc`

Shows VNC/noVNC connection info — display, ports, tunnel command, and where the password is stored.

```bash
npx @ssdavidai/zobsidian vnc
```

### `zobsidian teardown`

Stops all services, removes supervisor config, cleans up startup scripts, secrets, and config files. Does not remove installed binaries or your vault.

```bash
npx @ssdavidai/zobsidian teardown
```

## Architecture

5 supervisord programs, started in priority order:

| Priority | Program | Description |
|----------|---------|-------------|
| 100 | `zobsidian-xvfb` | Virtual framebuffer (display :5, 1920x1080x24) |
| 200 | `zobsidian-openbox` | Window manager (waits for display) |
| 300 | `zobsidian-x11vnc` | VNC server on port 5900 (waits for display) |
| 350 | `zobsidian-novnc` | noVNC web client on port 6080 (waits for VNC) |
| 400 | `zobsidian` | Obsidian app (waits for display + openbox) |

Each service waits for its dependencies before starting. All services auto-restart on failure.

## How It Works

Under the hood, zobsidian:

1. Installs Xvfb, openbox, x11vnc, noVNC/websockify, and the Obsidian `.deb` package
2. Saves your VNC password and config to `~/.zo_secrets` and `~/.zobsidian/config.json`
3. Writes 5 startup scripts to `/usr/local/bin/start-zobsidian-*.sh` with your display/port settings
4. Injects 5 `[program:zobsidian-*]` entries into `/etc/zo/supervisord-user.conf`
5. Registers the service in `/substrate_runtime_info.json`
6. Obsidian launches on the virtual display and Sync keeps your vault current

All operations are idempotent — running setup multiple times is safe.

## Tips

- **Use an SSH tunnel for noVNC.** The noVNC port is not exposed publicly. Use `ssh -L 6080:localhost:6080` to access it from your browser.
- **Native VNC works too.** Any VNC client can connect to port 5900 (via SSH tunnel: `ssh -L 5900:localhost:5900`).
- **Vault location matters.** Keep your vault in `/home/workspace/` so it persists across workspace rebuilds.
- **Check logs on issues.** Service logs are in `/dev/shm/zobsidian-*.log` and `/dev/shm/zobsidian-*_err.log`.
- **Config survives teardown/setup cycles.** Your Obsidian app data (login, Sync config) lives in `~/.config/obsidian/` — teardown doesn't touch it, so re-running setup reconnects Sync automatically.

## Requirements

- A Zo Computer workspace
- An Obsidian account with Sync
- Node.js (pre-installed on Zo)
