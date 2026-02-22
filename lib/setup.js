'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const {
  hasPrograms,
  injectPrograms,
  reloadSupervisor,
  getAllStatuses,
  PROGRAM_NAMES,
} = require('./supervisor');

const SECRETS_FILE = '/root/.zo_secrets';
const CONFIG_DIR = '/root/.zobsidian';
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const INSTALL_SCRIPT = path.join(__dirname, '..', 'scripts', 'install-deps.sh');

const SCRIPT_TARGETS = {
  'start-xvfb.sh': '/usr/local/bin/start-zobsidian-xvfb.sh',
  'start-openbox.sh': '/usr/local/bin/start-zobsidian-openbox.sh',
  'start-x11vnc.sh': '/usr/local/bin/start-zobsidian-x11vnc.sh',
  'start-novnc.sh': '/usr/local/bin/start-zobsidian-novnc.sh',
  'start-obsidian.sh': '/usr/local/bin/start-zobsidian.sh',
};

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function readSecrets() {
  if (!fs.existsSync(SECRETS_FILE)) return '';
  return fs.readFileSync(SECRETS_FILE, 'utf8');
}

function setSecret(name, value) {
  let content = readSecrets();
  const line = `export ${name}="${value}"`;
  const regex = new RegExp(`^export ${name}=.*$`, 'm');

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + '\n' + line + '\n';
  }

  fs.writeFileSync(SECRETS_FILE, content);
}

function getSecret(name) {
  const content = readSecrets();
  const match = content.match(new RegExp(`^export ${name}="?([^"\\n]*)"?`, 'm'));
  return match ? match[1] : null;
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function checkDeps() {
  const bins = ['Xvfb', 'openbox', 'x11vnc', 'websockify'];
  const missing = [];
  for (const bin of bins) {
    try {
      execSync(`command -v ${bin}`, { encoding: 'utf8' });
    } catch {
      missing.push(bin);
    }
  }
  // Check for Obsidian
  try {
    execSync('command -v obsidian || test -x /usr/bin/obsidian || test -x /opt/Obsidian/obsidian', { encoding: 'utf8' });
  } catch {
    missing.push('obsidian');
  }
  return missing;
}

function installDeps() {
  console.log('  Installing dependencies (this may take a few minutes)...');
  try {
    execSync(`bash ${INSTALL_SCRIPT}`, {
      stdio: 'inherit',
      timeout: 300000,
    });
    return true;
  } catch (e) {
    console.error('  Failed to install dependencies:', e.message);
    return false;
  }
}

function writeStartupScripts(config) {
  for (const [template, target] of Object.entries(SCRIPT_TARGETS)) {
    let content = fs.readFileSync(path.join(TEMPLATES_DIR, template), 'utf8');
    content = content.replace(/__DISPLAY__/g, config.display);
    content = content.replace(/__VNC_PORT__/g, String(config.vnc_port));
    content = content.replace(/__NOVNC_PORT__/g, String(config.novnc_port));
    content = content.replace(/__VAULT_PATH__/g, config.vault_path);
    fs.writeFileSync(target, content, { mode: 0o755 });
  }
}

function registerRuntime(config) {
  const runtimeFile = '/substrate_runtime_info.json';
  let runtime = {};
  if (fs.existsSync(runtimeFile)) {
    try {
      runtime = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
    } catch {
      runtime = {};
    }
  }

  if (!runtime.services) runtime.services = {};
  runtime.services.zobsidian = {
    name: 'zobsidian',
    description: 'Headless Obsidian with Sync',
    ports: {
      vnc: config.vnc_port,
      novnc: config.novnc_port,
    },
    display: config.display,
    vault_path: config.vault_path,
  };

  fs.writeFileSync(runtimeFile, JSON.stringify(runtime, null, 2) + '\n');
}

function waitForServices(maxWait = 30) {
  for (let i = 0; i < maxWait; i++) {
    const statuses = getAllStatuses();
    const allRunning = statuses.every((s) => s.status.includes('RUNNING'));
    if (allRunning) return statuses;
    execSync('sleep 1');
  }
  return getAllStatuses();
}

async function runSetup() {
  console.log('\n  zobsidian setup\n');

  // Step 1: Check/install deps
  console.log('Step 1/7: Checking dependencies...');
  const missing = checkDeps();
  if (missing.length > 0) {
    console.log(`  Missing: ${missing.join(', ')}`);
    if (!installDeps()) {
      console.error('Failed to install dependencies. Please install manually and retry.');
      process.exit(1);
    }
    // Re-check
    const stillMissing = checkDeps();
    if (stillMissing.length > 0) {
      console.error(`Still missing after install: ${stillMissing.join(', ')}`);
      process.exit(1);
    }
    console.log('  All dependencies installed');
  } else {
    console.log('  All dependencies present');
  }

  // Step 2: Prompt for config
  console.log('\nStep 2/7: Configuration...');
  const existing = loadConfig();

  const display = (await prompt(`  Display [${existing.display || ':5'}]: `)) || existing.display || ':5';
  const vnc_port = parseInt((await prompt(`  VNC port [${existing.vnc_port || '5900'}]: `)) || existing.vnc_port || '5900', 10);
  const novnc_port = parseInt((await prompt(`  noVNC port [${existing.novnc_port || '6080'}]: `)) || existing.novnc_port || '6080', 10);
  const vault_path = (await prompt(`  Vault path [${existing.vault_path || '/home/workspace/obsidian-vault/'}]: `)) || existing.vault_path || '/home/workspace/obsidian-vault/';

  const config = { display, vnc_port, novnc_port, vault_path };
  saveConfig(config);
  console.log('  Config saved to ' + CONFIG_FILE);

  // Ensure vault directory exists
  fs.mkdirSync(vault_path, { recursive: true });

  // Step 3: VNC password
  console.log('\nStep 3/7: VNC password...');
  const existingPw = getSecret('ZOBSIDIAN_VNC_PASSWORD');
  let vncPassword;
  if (existingPw) {
    const reuse = await prompt(`  Found existing VNC password. Keep it? [Y/n] `);
    if (reuse.toLowerCase() === 'n') {
      vncPassword = await prompt('  Enter new VNC password: ');
    } else {
      vncPassword = existingPw;
    }
  } else {
    vncPassword = await prompt('  Enter VNC password: ');
  }
  if (!vncPassword) {
    console.error('  VNC password is required.');
    process.exit(1);
  }

  setSecret('ZOBSIDIAN_VNC_PASSWORD', vncPassword);
  setSecret('ZOBSIDIAN_DISPLAY', display);
  setSecret('ZOBSIDIAN_VNC_PORT', String(vnc_port));
  setSecret('ZOBSIDIAN_NOVNC_PORT', String(novnc_port));
  setSecret('ZOBSIDIAN_VAULT_PATH', vault_path);
  console.log('  Secrets saved to ~/.zo_secrets');

  // Step 4: Write startup scripts
  console.log('\nStep 4/7: Writing startup scripts...');
  writeStartupScripts(config);
  for (const target of Object.values(SCRIPT_TARGETS)) {
    console.log('  ' + target);
  }

  // Step 5: Inject supervisor programs
  console.log('\nStep 5/7: Supervisor configuration...');
  if (hasPrograms()) {
    console.log('  Supervisor config already has zobsidian programs');
  } else {
    injectPrograms();
    console.log('  Injected 5 programs into supervisor config');
  }

  // Step 6: Register in runtime info
  console.log('\nStep 6/7: Registering service...');
  registerRuntime(config);
  console.log('  Registered in /substrate_runtime_info.json');

  // Step 7: Start and verify
  console.log('\nStep 7/7: Starting services...');
  try {
    reloadSupervisor();
    console.log('  Supervisor reloaded');
  } catch (e) {
    console.error('  Warning: Could not reload supervisor:', e.message);
  }

  console.log('  Waiting for services to start...');
  const statuses = waitForServices();

  const allRunning = statuses.every((s) => s.status.includes('RUNNING'));
  console.log('');
  for (const s of statuses) {
    const icon = s.status.includes('RUNNING') ? '+' : '!';
    console.log(`  [${icon}] ${s.name}: ${s.status}`);
  }

  if (allRunning) {
    console.log(`\n  zobsidian is running!`);
    console.log(`\n  To access Obsidian via browser:`);
    console.log(`    1. SSH tunnel: ssh -L ${novnc_port}:localhost:${novnc_port} <your-zo-host>`);
    console.log(`    2. Open: http://localhost:${novnc_port}/vnc.html`);
    console.log(`    3. Enter your VNC password`);
    console.log(`\n  First time: sign into Obsidian and enable Sync.`);
    console.log(`  After that, Obsidian Sync runs continuously in the background.`);
  } else {
    console.log('\n  Warning: Not all services reached RUNNING state.');
    console.log('  Check logs in /dev/shm/zobsidian-*.log');
  }
}

module.exports = { runSetup, getSecret, setSecret, prompt };
