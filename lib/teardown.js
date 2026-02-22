'use strict';

const fs = require('fs');
const readline = require('readline');
const {
  hasPrograms,
  removePrograms,
  reloadSupervisor,
  stopAll,
} = require('./supervisor');

const SECRETS_FILE = '/root/.zo_secrets';
const CONFIG_DIR = '/root/.zobsidian';
const RUNTIME_FILE = '/substrate_runtime_info.json';

const STARTUP_SCRIPTS = [
  '/usr/local/bin/start-zobsidian-xvfb.sh',
  '/usr/local/bin/start-zobsidian-openbox.sh',
  '/usr/local/bin/start-zobsidian-x11vnc.sh',
  '/usr/local/bin/start-zobsidian-novnc.sh',
  '/usr/local/bin/start-zobsidian.sh',
];

const SECRET_KEYS = [
  'ZOBSIDIAN_VNC_PASSWORD',
  'ZOBSIDIAN_DISPLAY',
  'ZOBSIDIAN_VNC_PORT',
  'ZOBSIDIAN_NOVNC_PORT',
  'ZOBSIDIAN_VAULT_PATH',
];

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function removeSecret(name) {
  if (!fs.existsSync(SECRETS_FILE)) return;
  let content = fs.readFileSync(SECRETS_FILE, 'utf8');
  const regex = new RegExp(`^export ${name}=.*\\n?`, 'gm');
  content = content.replace(regex, '');
  fs.writeFileSync(SECRETS_FILE, content);
}

function unregisterRuntime() {
  if (!fs.existsSync(RUNTIME_FILE)) return;
  try {
    const runtime = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));
    if (runtime.services && runtime.services.zobsidian) {
      delete runtime.services.zobsidian;
      fs.writeFileSync(RUNTIME_FILE, JSON.stringify(runtime, null, 2) + '\n');
    }
  } catch {
    // ignore parse errors
  }
}

async function runTeardown() {
  console.log('\n  zobsidian teardown\n');

  const answer = await prompt('This will remove all zobsidian services from this workspace. Continue? [y/N] ');
  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    return;
  }

  // Stop all services (reverse order)
  console.log('\nStopping services...');
  const results = stopAll();
  for (const r of results) {
    const ok = r.result.includes('stopped') || r.result.includes('not running');
    console.log(`  ${ok ? '+' : '!'} ${r.name}: ${r.result}`);
  }

  // Remove supervisor config
  if (hasPrograms()) {
    removePrograms();
    console.log('+ Removed zobsidian programs from supervisor config');
    try {
      reloadSupervisor();
      console.log('+ Supervisor reloaded');
    } catch (e) {
      console.log('  Warning: Could not reload supervisor:', e.message);
    }
  } else {
    console.log('  Supervisor config already clean');
  }

  // Remove startup scripts
  for (const script of STARTUP_SCRIPTS) {
    if (fs.existsSync(script)) {
      fs.unlinkSync(script);
    }
  }
  console.log('+ Removed startup scripts');

  // Remove secrets
  for (const key of SECRET_KEYS) {
    removeSecret(key);
  }
  console.log('+ Removed zobsidian secrets from ~/.zo_secrets');

  // Unregister from runtime info
  unregisterRuntime();
  console.log('+ Unregistered from /substrate_runtime_info.json');

  // Remove config dir
  if (fs.existsSync(CONFIG_DIR)) {
    fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
    console.log('+ Removed ' + CONFIG_DIR);
  }

  console.log('\n  zobsidian has been removed from this workspace.');
  console.log('  Note: Obsidian, Xvfb, openbox, x11vnc, and noVNC binaries were not removed.');
  console.log('  Note: Your vault directory was not removed.');
}

module.exports = { runTeardown };
