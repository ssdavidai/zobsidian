'use strict';

const { getAllStatuses, PROGRAM_NAMES } = require('./supervisor');

function runStatus() {
  console.log('\n  zobsidian status\n');

  const statuses = getAllStatuses();
  let allRunning = true;

  for (const s of statuses) {
    const icon = s.status.includes('RUNNING') ? '+' : '-';
    console.log(`  [${icon}] ${s.name.padEnd(22)} ${s.status}`);
    if (!s.status.includes('RUNNING')) allRunning = false;
  }

  console.log('');
  if (allRunning) {
    console.log(`  All ${PROGRAM_NAMES.length} services are running.`);
  } else {
    console.log('  Some services are not running. Check logs in /dev/shm/zobsidian-*.log');
  }
}

module.exports = { runStatus };
