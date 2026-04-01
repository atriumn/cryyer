#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Auto-load .env if present (Node 20.6+)
try { process.loadEnvFile(); } catch { /* no .env, that's fine */ }

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  return pkg.version as string;
}

function printHelp(): void {
  console.log(`
cryyer — automated product update emails

Usage:
  cryyer <command> [options]

Commands:
  init          Interactive product setup
  auth          Manage authentication (gmail, linkedin)
  check         Validate config and connections
  run           Full pipeline: gather → draft → send
  draft         Generate drafts → create GitHub issues
  send          Send emails for a closed draft issue
  draft-file    Generate a draft → write to markdown file
  send-file     Send emails from a draft markdown file
  preview       Show gathered activity without drafting
  social        Social content pipeline (seed, draft, send)
  blog          Blog publishing (publish to product repos)

Options:
  --help, -h    Show this help message
  --version, -V Print version

Run 'cryyer <command> --help' for more information on a command.
`.trimStart());
}

function printSocialHelp(): void {
  console.log(`
cryyer social — social content pipeline

Usage:
  cryyer social <command> [options]

Commands:
  seed <productId> <type> "<text>"                     Add a seed to seeds/{productId}.md
  draft --product <id> [--type <type>]                 Generate social posts from seeds
  send <draft-path>                                    Post to social platforms (LinkedIn)
  blog-publish <draft-path> --product <id>             Commit blog post to product repo

Options:
  --config-dir <path>  Config directory (products/, seeds/, social-drafts/)
  --help, -h           Show this help message

Environment:
  CRYYER_CONFIG_DIR    Fallback for --config-dir when flag is not provided

Run 'cryyer social <command> --help' for more information on a command.
`.trimStart());
}

function printBlogHelp(): void {
  console.log(`
cryyer blog — blog publishing

Usage:
  cryyer blog <command> [options]

Commands:
  publish <draft-path> --product <id>    Commit blog post to product repo

Options:
  --dry-run            Preview without committing
  --config-dir <path>  Config directory (products/, seeds/, social-drafts/)
  --help, -h           Show this help message

Environment:
  CRYYER_CONFIG_DIR    Fallback for --config-dir when flag is not provided

Run 'cryyer blog <command> --help' for more information on a command.
`.trimStart());
}

async function runBlog(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printBlogHelp();
    return;
  }

  const blogCommands: Record<string, string> = {
    publish: './social/blog-publish.js',
  };

  const modulePath = blogCommands[subcommand];
  if (!modulePath) {
    console.error(`Unknown blog command: ${subcommand}\n`);
    printBlogHelp();
    process.exitCode = 1;
    return;
  }

  const mod = await import(modulePath) as { main: () => Promise<void> };
  await mod.main();
}

async function runSocial(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printSocialHelp();
    return;
  }

  const socialCommands: Record<string, string> = {
    seed: './social/seed.js',
    draft: './social/draft.js',
    send: './social/send.js',
    'blog-publish': './social/blog-publish.js',
  };

  const modulePath = socialCommands[subcommand];
  if (!modulePath) {
    console.error(`Unknown social command: ${subcommand}\n`);
    printSocialHelp();
    process.exitCode = 1;
    return;
  }

  const mod = await import(modulePath) as { main: () => Promise<void> };
  await mod.main();
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

  if (command === 'social') {
    await runSocial(args.slice(1));
    return;
  }

  if (command === 'blog') {
    await runBlog(args.slice(1));
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
