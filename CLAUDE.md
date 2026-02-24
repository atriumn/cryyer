# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run typecheck    # Type-check without emitting
npm run lint         # ESLint on src/
npm test             # Run unit tests (vitest)
npm run test:watch   # Run tests in watch mode
npm run dev          # Build then run (npm run build && npm start)
npm start            # Run compiled output (node dist/index.js)
npm run mcp          # Run MCP server (node dist/mcp.js)
```

## What Cryer Does

Cryer sends automated weekly email updates to beta testers, with per-product voice powered by LLM-drafted content. It supports multiple LLM providers (Anthropic Claude, OpenAI, Google Gemini) via a configurable adapter pattern. It follows a two-stage pipeline:

1. **Weekly Draft** (cron, Mondays): For each product, gathers GitHub activity (merged PRs, releases, notable commits), generates an email draft via Claude, and creates a GitHub issue for human review.
2. **Send on Close**: When a draft issue is closed (approved), emails are sent to subscribers via Resend.

## Architecture

Four distinct entry points, each compiled from `src/` to `dist/`:

- **`index.ts`** — Direct orchestration: gather activity, draft, query subscribers, send emails in one run.
- **`draft.ts`** — Used by `weekly-draft.yml` workflow. Gathers activity, generates drafts via LLM, creates GitHub issues with `draft` + product-id labels.
- **`send-on-close.ts`** — Used by `send-update.yml` workflow. Triggered on issue close, parses the draft issue body (`**Subject:** ...\n\n---\n\n<body>`), queries Supabase for subscribers, sends via Resend, posts delivery stats as issue comment.
- **`mcp.ts`** — MCP server for Claude Desktop. Exposes 9 tools (list/get/update/send/regenerate drafts, list products, list/add/remove subscribers) and 1 prompt (`review_weekly_drafts`). Uses stdio transport. Run via `node dist/mcp.js` or `npx cryer-mcp`.

Key modules:

| Module | Role |
|---|---|
| `config.ts` | Loads env vars, discovers and parses `products/*.yaml` |
| `gather.ts` | Fetches merged PRs, releases, fallback commits via Octokit; filters bots |
| `llm-provider.ts` | LLMProvider interface and factory; adapters for Anthropic, OpenAI, Gemini |
| `summarize.ts` | Builds prompt with product voice, calls LLM provider, parses JSON `{subject, body}` response |
| `subscriber-store.ts` | SubscriberStore interface and factory; adapters for Supabase, JSON file, Google Sheets. Supports `getSubscribers`, `recordEmailSent`, `addSubscriber`, `removeSubscriber`. |
| `mcp.ts` | MCP server entry point; 9 tools + 1 prompt for draft review and subscriber management |
| `subscribers.ts` | *(deprecated)* Legacy Supabase subscriber query; use `subscriber-store.ts` instead |
| `send.ts` | Sends batch emails via Resend with HTML template wrapping |
| `llm.ts` / `email.ts` / `github.ts` / `db.ts` | Thin client constructors for Resend, Octokit, Supabase; legacy LLM helper. `db.ts` is deprecated in favor of `subscriber-store.ts` |

## Product Configuration

Products are defined in `products/*.yaml`. Schema:

```yaml
id: string                     # Unique identifier, also used as GitHub issue label
name: string                   # Display name
voice: string                  # Multi-line LLM voice/tone instructions
repo: string                   # "owner/repo" for activity gathering
emailSubjectTemplate: string   # Template with {{weekOf}} placeholder
# Optional:
tagline, supabase_table, product_filter, from_name, from_email, reply_to
```

The `voice` field is injected directly into the Claude prompt and controls the tone of generated emails.

## Environment Variables

Required across entry points (not all needed for every entry point):

```
GITHUB_TOKEN, RESEND_API_KEY
FROM_EMAIL, FROM_NAME
CRYER_REPO          # "owner/repo" for draft issue creation
CRYER_ROOT          # Project root path (MCP server only; defaults to cwd)
ISSUE_NUMBER         # Set by GitHub Actions for send-on-close
GITHUB_REPOSITORY    # Set by GitHub Actions
```

### Subscriber Store Configuration

```
SUBSCRIBER_STORE             # "supabase" (default), "json", or "google-sheets"
# Supabase (default):
SUPABASE_URL, SUPABASE_SERVICE_KEY
# JSON file:
SUBSCRIBERS_JSON_PATH        # Default: ./subscribers.json
EMAIL_LOG_JSON_PATH          # Default: ./email-log.json
# Google Sheets:
GOOGLE_SHEETS_SPREADSHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

### LLM Provider Configuration

```
LLM_PROVIDER         # "anthropic" (default), "openai", or "gemini"
LLM_MODEL            # Override default model (e.g. "gpt-4o", "gemini-1.5-pro")
ANTHROPIC_API_KEY    # Required when LLM_PROVIDER=anthropic (or unset)
OPENAI_API_KEY       # Required when LLM_PROVIDER=openai
GEMINI_API_KEY       # Required when LLM_PROVIDER=gemini
```

Default models per provider: Anthropic → `claude-3-5-haiku-latest`, OpenAI → `gpt-4o`, Gemini → `gemini-1.5-flash`.

## GitHub Workflows

- **`ci.yml`**: Runs on push/PR to main. Lints, typechecks, and runs tests.
- **`weekly-draft.yml`**: Cron Monday 1pm UTC. Runs `node dist/draft.js`. Needs `GITHUB_TOKEN`, `CRYER_REPO`, and the API key for the configured `LLM_PROVIDER`.
- **`send-update.yml`**: Fires on issue close (filtered to `draft` label). Runs `node dist/send-on-close.js`. Needs all Resend/Supabase secrets.

## Conventions

- ESM modules (`"type": "module"` in package.json), imports use `.js` extensions
- TypeScript strict mode, target ES2022, module Node16
- Shared types in `src/types.ts`
- `repo` is the preferred field in product YAML; `githubRepo` is deprecated
- Bot activity (dependabot, renovate, github-actions) is filtered out in `gather.ts`
- LLM provider is configurable via `LLM_PROVIDER` env var; defaults to Anthropic Claude
- Default model per provider can be overridden via `LLM_MODEL` env var
- Subscriber store is configurable via `SUBSCRIBER_STORE` env var; defaults to Supabase
- `db.ts` and `subscribers.ts` are deprecated; use `subscriber-store.ts` for all subscriber access
