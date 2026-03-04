#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  return pkg.version as string;
}

function printHelp(): void {
  console.log(`
cryyer — automated email updates for beta testers

Usage:
  cryyer <command> [options]

Commands:
  init          Interactive product setup
  auth gmail    Authorize Gmail via OAuth 2.0
  check         Validate config and connections
  run           Full pipeline: gather → draft → send
  draft         Generate drafts → create GitHub issues
  send          Send emails for a closed draft issue
  draft-file    Generate a draft → write to markdown file
  send-file     Send emails from a draft markdown file
  preview       Show gathered activity without drafting

Options:
  --help, -h    Show this help message
  --version, -V Print version

Run 'cryyer <command> --help' for more information on a command.
`.trimStart());
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === '--version' || command === '-V') {
    console.log(getVersion());
    return;
  }

  const commands: Record<string, string> = {
    init: './init.js',
    auth: './auth.js',
    check: './check.js',
    run: './index.js',
    draft: './draft.js',
    send: './send-on-close.js',
    'draft-file': './draft-file.js',
    'send-file': './send-file.js',
    preview: './preview.js',
  };

  const modulePath = commands[command];
  if (!modulePath) {
    console.error(`Unknown command: ${command}\n`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  const mod = await import(modulePath) as { main: () => Promise<void> };
  await mod.main();
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
