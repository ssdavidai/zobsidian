'use strict';

const fs = require('fs');
const { execSync } = require('child_process');

const SUPERVISOR_CONF = '/etc/zo/supervisord-user.conf';
const SUPERVISOR_URL = 'http://127.0.0.1:29011';

const PROGRAM_NAMES = [
  'zobsidian-xvfb',
  'zobsidian-openbox',
  'zobsidian-x11vnc',
  'zobsidian-novnc',
  'zobsidian',
];

function makeProgramBlock(name, command, priority, extras = '') {
  return `[program:${name}]
command=${command}
directory=/root
autostart=true
autorestart=true
priority=${priority}
startretries=10
startsecs=5
stdout_logfile=/dev/shm/${name}.log
stderr_logfile=/dev/shm/${name}_err.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
stopsignal=TERM
stopasgroup=true
killasgroup=true
stopwaitsecs=10
${extras}`;
}

const PROGRAM_BLOCKS = [
  makeProgramBlock(
    'zobsidian-xvfb',
    '/usr/local/bin/start-zobsidian-xvfb.sh',
    100
  ),
  makeProgramBlock(
    'zobsidian-openbox',
    '/usr/local/bin/start-zobsidian-openbox.sh',
    200
  ),
  makeProgramBlock(
    'zobsidian-x11vnc',
    '/usr/local/bin/start-zobsidian-x11vnc.sh',
    300
  ),
  makeProgramBlock(
    'zobsidian-novnc',
    '/usr/local/bin/start-zobsidian-novnc.sh',
    350
  ),
  makeProgramBlock(
    'zobsidian',
    '/usr/local/bin/start-zobsidian.sh',
    400
  ),
];

function hasPrograms() {
  if (!fs.existsSync(SUPERVISOR_CONF)) return false;
  const content = fs.readFileSync(SUPERVISOR_CONF, 'utf8');
  return content.includes('[program:zobsidian-xvfb]');
}

function injectPrograms() {
  if (hasPrograms()) return false;

  let content = fs.readFileSync(SUPERVISOR_CONF, 'utf8');
  const block = PROGRAM_BLOCKS.join('\n') + '\n';

  // Find the first [program:*] section and insert before it
  const programMatch = content.match(/^(\[program:)/m);
  if (programMatch) {
    const idx = content.indexOf(programMatch[0]);
    content = content.slice(0, idx) + block + '\n' + content.slice(idx);
  } else {
    content = content.trimEnd() + '\n\n' + block;
  }

  fs.writeFileSync(SUPERVISOR_CONF, content);
  return true;
}

function removePrograms() {
  if (!hasPrograms()) return false;

  let content = fs.readFileSync(SUPERVISOR_CONF, 'utf8');

  for (const name of PROGRAM_NAMES) {
    const regex = new RegExp(`\\[program:${name}\\][^\\[]*(?=\\[|$)`, 's');
    content = content.replace(regex, '');
  }

  // Clean up extra blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(SUPERVISOR_CONF, content);
  return true;
}

function supervisorctl(cmd) {
  return execSync(`supervisorctl -s ${SUPERVISOR_URL} ${cmd}`, {
    encoding: 'utf8',
    timeout: 15000,
  }).trim();
}

function reloadSupervisor() {
  supervisorctl('reread');
  return supervisorctl('update');
}

function getProgramStatus(name) {
  try {
    return supervisorctl(`status ${name}`);
  } catch (e) {
    return e.stdout || e.message;
  }
}

function getAllStatuses() {
  return PROGRAM_NAMES.map((name) => ({
    name,
    status: getProgramStatus(name),
  }));
}

function stopAll() {
  const results = [];
  for (const name of [...PROGRAM_NAMES].reverse()) {
    try {
      results.push({ name, result: supervisorctl(`stop ${name}`) });
    } catch (e) {
      results.push({ name, result: e.stdout || e.message });
    }
  }
  return results;
}

module.exports = {
  SUPERVISOR_CONF,
  PROGRAM_NAMES,
  hasPrograms,
  injectPrograms,
  removePrograms,
  reloadSupervisor,
  getAllStatuses,
  stopAll,
};
