#!/usr/bin/env node
/**
 * Unified Notion CLI.
 *
 * Usage:
 *   node scripts/notion.mjs bootstrap
 *   node scripts/notion.mjs migrate --all
 *   node scripts/notion.mjs migrate -t profile
 *   node scripts/notion.mjs migrate -t skills
 *   node scripts/notion.mjs migrate -t projects
 *   node scripts/notion.mjs migrate -t experience
 *   node scripts/notion.mjs sync
 *   node scripts/notion.mjs verify
 *   node scripts/notion.mjs clean --all
 *   node scripts/notion.mjs clean -t projects
 *
 * @module notion-cli
 */

import { bootstrap } from './commands/bootstrap.mjs';
import { migrate } from './commands/migrate.mjs';
import { sync } from './commands/sync.mjs';
import { verify } from './commands/verify.mjs';
import { clean } from './commands/clean.mjs';

const COMMANDS = {
  bootstrap,
  migrate,
  sync,
  verify,
  clean,
};

function parseArgs(argv) {
  const args = argv.slice(2);
  let command = args[0];
  const flags = {};

  // Handle --help as first arg
  if (command === '--help' || command === '-h') {
    flags.help = true;
    command = null;
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--all' || arg === '-a') {
      flags.all = true;
    } else if (arg === '-t' || arg === '--type') {
      flags.type = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    }
  }

  return { command, flags };
}

function printHelp() {
  console.log(`
Usage: node scripts/notion.mjs <command> [options]

Commands:
  bootstrap              Create Notion databases
  migrate [--all|-t]     Seed data to Notion
  sync                   Pull Notion → JSON + MDX files
  verify                 Verify Notion block content
  clean  [--all|-t]      Archive Notion pages

Options:
  --all, -a              Target all data types
  -t, --type <type>      Target specific type (profile|skills|experience|projects)
  --help, -h             Show this help

Examples:
  node scripts/notion.mjs migrate --all
  node scripts/notion.mjs migrate -t profile
  node scripts/notion.mjs clean -t projects
  `);
}

async function main() {
  const { command, flags } = parseArgs(process.argv);

  if (!command || flags.help) {
    printHelp();
    return;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  try {
    await handler(flags);
  } catch (e) {
    console.error(`[notion] ${command} failed:`, e.message);
    process.exitCode = 1;
  }
}

main();
