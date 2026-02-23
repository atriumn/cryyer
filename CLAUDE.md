# Beacon — Project Context

## Overview
Beacon is a centralized beta tester update system that sends automated weekly emails with per-product voice powered by LLM drafts.

## Architecture

### Core Flow
1. Load product configs from `products/*.yaml`
2. Fetch weekly GitHub activity (closed issues, merged PRs) via Octokit
3. Draft email content using Claude (Anthropic SDK) with product-specific voice
4. Look up beta testers from Supabase
5. Send emails via Resend
6. Log sent emails to Supabase

### Directory Structure
```
src/
  index.ts      — Main entry point and orchestration
  config.ts     — Environment config loading and product YAML parsing
  github.ts     — GitHub API client (Octokit) for fetching weekly changes
  llm.ts        — Anthropic SDK for LLM-drafted email content
  email.ts      — Resend client for sending emails
  db.ts         — Supabase client for beta tester and email log data
  types.ts      — Shared TypeScript types
products/       — Per-product YAML configuration files
templates/      — Email template files
dist/           — Compiled JavaScript output (gitignored)
```

## Environment Variables
```
GITHUB_TOKEN        — GitHub personal access token
ANTHROPIC_API_KEY   — Anthropic API key
RESEND_API_KEY      — Resend API key
SUPABASE_URL        — Supabase project URL
SUPABASE_KEY        — Supabase anon/service key
FROM_EMAIL          — Sender email address
```

## Product Config Schema (products/*.yaml)
```yaml
id: string           # Unique product identifier
name: string         # Display name
voice: string        # LLM voice/tone instructions
githubRepo: string   # "owner/repo" format
emailSubjectTemplate: string  # Subject with {{weekOf}} placeholder
```

## Commands
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run typecheck    # Type check without emitting
npm start            # Run compiled output
npm run dev          # Run with ts-node (development)
```

## Key Dependencies
- `octokit` — GitHub REST API client
- `@anthropic-ai/sdk` — Claude LLM for email drafts
- `resend` — Transactional email sending
- `@supabase/supabase-js` — Database for testers and email logs
- `yaml` — Parse product configuration files
