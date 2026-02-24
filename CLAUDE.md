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
```

## What Cryer Does

Cryer sends automated weekly email updates to beta testers, with per-product voice powered by Claude-drafted content. It follows a two-stage pipeline:

1. **Weekly Draft** (cron, Mondays): For each product, gathers GitHub activity (merged PRs, releases, notable commits), generates an email draft via Claude, and creates a GitHub issue for human review.
2. **Send on Close**: When a draft issue is closed (approved), emails are sent to subscribers via Resend.

## Architecture

Three distinct entry points, each compiled from `src/` to `dist/`:

- **`index.ts`** — Direct orchestration: gather activity, draft, query subscribers, send emails in one run.
- **`draft.ts`** — Used by `weekly-draft.yml` workflow. Gathers activity, generates drafts via LLM, creates GitHub issues with `draft` + product-id labels.
- **`send-on-close.ts`** — Used by `send-update.yml` workflow. Triggered on issue close, parses the draft issue body (`**Subject:** ...\n\n---\n\n<body>`), queries Supabase for subscribers, sends via Resend, posts delivery stats as issue comment.

Key modules:

| Module | Role |
|---|---|
| `config.ts` | Loads env vars, discovers and parses `products/*.yaml` |
| `gather.ts` | Fetches merged PRs, releases, fallback commits via Octokit; filters bots |
| `summarize.ts` | Builds prompt with product voice, calls Claude, parses JSON `{subject, body}` response |
| `subscribers.ts` | Queries Supabase for active beta testers per product |
| `send.ts` | Sends batch emails via Resend with HTML template wrapping |
| `llm.ts` / `email.ts` / `github.ts` / `db.ts` | Thin client constructors for Anthropic, Resend, Octokit, Supabase |

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
GITHUB_TOKEN, ANTHROPIC_API_KEY, RESEND_API_KEY
SUPABASE_URL, SUPABASE_SERVICE_KEY
FROM_EMAIL, FROM_NAME
CRYER_REPO          # "owner/repo" for draft issue creation
ISSUE_NUMBER         # Set by GitHub Actions for send-on-close
GITHUB_REPOSITORY    # Set by GitHub Actions
```

## GitHub Workflows

- **`ci.yml`**: Runs on push/PR to main. Lints, typechecks, and runs tests.
- **`weekly-draft.yml`**: Cron Monday 1pm UTC. Runs `node dist/draft.js`. Needs `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, `CRYER_REPO`.
- **`send-update.yml`**: Fires on issue close (filtered to `draft` label). Runs `node dist/send-on-close.js`. Needs all Resend/Supabase secrets.

## Conventions

- ESM modules (`"type": "module"` in package.json), imports use `.js` extensions
- TypeScript strict mode, target ES2022, module Node16
- Shared types in `src/types.ts`
- `repo` is the preferred field in product YAML; `githubRepo` is deprecated
- Bot activity (dependabot, renovate, github-actions) is filtered out in `gather.ts`
- LLM defaults to Haiku; Sonnet available via `options.model`
