#!/usr/bin/env node
'use strict';

const command = process.argv[2];

const USAGE = `
zobsidian — Headless Obsidian with Sync for Zo machines

Usage:
  zobsidian setup      Install deps, configure virtual display, start Obsidian
  zobsidian status     Show service health for all 5 components
  zobsidian vnc        Show VNC/noVNC connection info
  zobsidian teardown   Stop all services and remove configuration
`;

async function main() {
  switch (command) {
    case 'setup': {
      const { runSetup } = require('../lib/setup');
      await runSetup();
      break;
    }
    case 'status': {
      const { runStatus } = require('../lib/status');
      runStatus();
      break;
    }
    case 'vnc': {
      const { runVncInfo } = require('../lib/vnc-info');
      runVncInfo();
      break;
    }
    case 'teardown': {
      const { runTeardown } = require('../lib/teardown');
      await runTeardown();
      break;
    }
    default:
      console.log(USAGE);
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
