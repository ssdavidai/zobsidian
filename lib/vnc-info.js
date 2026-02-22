'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '/root/.zobsidian/config.json';

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

function runVncInfo() {
  console.log('\n  zobsidian VNC info\n');

  const config = loadConfig();
  if (!config) {
    console.log('  zobsidian is not configured. Run "zobsidian setup" first.');
    process.exit(1);
  }

  console.log('  Display:       ' + config.display);
  console.log('  VNC port:      ' + config.vnc_port);
  console.log('  noVNC port:    ' + config.novnc_port);
  console.log('  Vault path:    ' + config.vault_path);

  console.log('\n  Native VNC client:');
  console.log(`    vnc://localhost:${config.vnc_port}`);

  console.log('\n  Browser access (noVNC):');
  console.log(`    1. SSH tunnel: ssh -L ${config.novnc_port}:localhost:${config.novnc_port} <your-zo-host>`);
  console.log(`    2. Open:       http://localhost:${config.novnc_port}/vnc.html`);

  console.log('\n  Password: stored in ~/.zo_secrets as ZOBSIDIAN_VNC_PASSWORD');
}

module.exports = { runVncInfo };
