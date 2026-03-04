# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm install         # Install dependencies
pnpm run build       # Compile TypeScript to dist/
pnpm run typecheck   # Type-check without emitting
pnpm run lint        # ESLint on src/
pnpm test            # Run unit tests (vitest)
pnpm run test:watch  # Run tests in watch mode
pnpm run dev         # Build then run (pnpm run build && pnpm start)
pnpm start           # Run compiled output (node dist/index.js)
pnpm run mcp         # Run MCP server (node dist/mcp.js)
```

## What Cryyer Does

Cryyer sends automated email updates to subscribers, with per-product voice powered by LLM-drafted content. It supports multiple audiences per product (e.g. beta testers vs enterprise customers), multiple LLM providers (Anthropic Claude, OpenAI, Google Gemini) via a configurable adapter pattern.

### Two pipelines

**Release pipeline** (fully automated, no manual review):
1. Push to `main` → release-please opens/updates a version-bump PR
2. `draft-email.yml` generates an email draft file (`drafts/vX.Y.Z.md`) and commits it to the PR branch
3. Merge the release-please PR → tag pushed → `release.yml` publishes to npm → GitHub Release created
4. `send-email.yml` fires on release publish, reads the draft file, sends emails to subscribers

**Weekly pipeline** (manual review via GitHub issues):
1. `weekly-draft.yml` runs on cron (Monday 1pm UTC) or manual trigger — gathers GitHub activity, generates LLM drafts, creates GitHub issues with `draft` label for human review
2. `send-update.yml` fires when a draft issue is closed — parses the issue body, sends emails to subscribers, posts delivery stats as a comment

The release pipeline uses `draft-file.ts` / `send-file.ts` (file-based). The weekly pipeline uses `draft.ts` / `send-on-close.ts` (issue-based). Both share the same core modules (gather, summarize, send, subscriber-store, email-provider).

## Architecture

Six distinct entry points, each compiled from `src/` to `dist/`:

- **`index.ts`** — Direct orchestration: gather activity, draft per audience, query subscribers, send emails in one run.
- **`draft.ts`** — Used by `weekly-draft.yml` workflow. Gathers activity, generates drafts via LLM, creates GitHub issues with `draft` + product-id labels. For multi-audience products, creates one issue per audience with `audience:{id}` labels.
- **`send-on-close.ts`** — Used by `send-update.yml` workflow. Triggered on issue close, parses the draft issue body (`**Subject:** ...\n\n---\n\n<body>`), queries subscriber store (audience-aware via `audience:*` label), sends via configured email provider, posts delivery stats as issue comment.
- **`draft-file.ts`** — CLI command `cryyer draft-file`. Gathers activity, generates LLM draft, writes a YAML front matter markdown file. Designed for release-triggered pipelines where the draft is committed to a PR branch. Accepts `--product`, `--output`, `--since`, `--repo`, `--audience` flags.
- **`send-file.ts`** — CLI command `cryyer send-file`. Reads a YAML front matter draft file (`---\nsubject: ...\n---\n\n<body>`), loads product config, fetches subscribers, sends emails. Accepts `<path>`, `--product`, `--dry-run`, `--audience` flags. Designed for post-release email delivery.
- **`mcp.ts`** — MCP server for Claude Desktop. Exposes 9 tools (list/get/update/send/regenerate drafts, list products, list/add/remove subscribers) and 1 prompt (`review_drafts`). Uses stdio transport. Run via `node dist/mcp.js` or `npx cryyer-mcp`.

Key modules:

| Module | Role |
|---|---|
| `config.ts` | Loads env vars, discovers and parses `products/*.yaml`, validates product config |
| `gather.ts` | Fetches merged PRs, releases, fallback commits via Octokit (`gatherActivity`); filters bots |
| `llm-provider.ts` | LLMProvider interface and factory; adapters for Anthropic, OpenAI, Gemini |
| `summarize.ts` | Builds prompt with product voice, calls LLM provider, parses JSON `{subject, body}` response |
| `subscriber-store.ts` | SubscriberStore interface and factory; adapters for Supabase, JSON file, Google Sheets. Supports `getSubscribers`, `recordEmailSent`, `addSubscriber`, `removeSubscriber`. |
| `mcp.ts` | MCP server entry point; 9 tools + 1 prompt for draft review and subscriber management |
| `email-provider.ts` | EmailProvider interface and factory; adapters for Resend, Gmail |
| `auth.ts` | `cryyer auth gmail` — OAuth 2.0 flow for Gmail authorization |
| `gmail-oauth.ts` | Google OAuth client ID/secret constants |
| `send.ts` | Builds email messages (`sendEmails`), delegates sending to EmailProvider |
| `draft-file.ts` | CLI: `cryyer draft-file` — gather activity → LLM draft → write YAML front matter file |
| `send-file.ts` | CLI: `cryyer send-file` — read YAML front matter draft → send emails to subscribers |

## Product Configuration

Products are defined in `products/*.yaml`. Schema:

```yaml
id: string                     # Unique identifier, also used as GitHub issue label
name: string                   # Display name
voice: string                  # Multi-line LLM voice/tone instructions (required when no audiences)
repo: string                   # "owner/repo" for activity gathering
emailSubjectTemplate: string   # Template with {{weekOf}} placeholder (required when no audiences)
# Optional:
tagline, supabase_table, product_filter, from_name, from_email, reply_to
filter:                        # Optional monorepo filtering
  labels: ["admin-portal"]     # Filter PRs by GitHub label (uses Search API)
  paths: ["apps/admin/"]       # Filter commits by path prefix
  tag_prefix: "admin/"         # Filter releases by tag prefix
audiences:                     # Optional: multiple audiences with different voices
  - id: string                 # Audience identifier (used in labels & subscriber keys)
    voice: string              # Voice/tone instructions for this audience
    emailSubjectTemplate: string
    from_name: string          # Optional: overrides product-level from_name
    from_email: string         # Optional: overrides product-level from_email
    reply_to: string           # Optional: overrides product-level reply_to
```

The `voice` field is injected directly into the LLM prompt and controls the tone of generated emails. Products must define either top-level `voice` + `emailSubjectTemplate` OR non-empty `audiences` with those fields per audience.

### Multi-Audience Support

Products can target different audiences (e.g. beta testers, enterprise customers) with different voice/tone from the same gathered activity. Define `audiences` in the product YAML:

```yaml
id: my-app
name: My App
repo: owner/my-app
audiences:
  - id: beta
    voice: "Casual, developer-friendly"
    emailSubjectTemplate: "{{weekOf}} Beta Update"
  - id: enterprise
    voice: "Professional, stability-focused"
    emailSubjectTemplate: "{{weekOf}} Release Notes"
```

Key behaviors:
- **Subscriber keys**: Uses compound key `productId:audienceId` (e.g. `my-app:beta`). No subscriber store interface changes needed.
- **Draft issues**: One issue per audience, with `audience:{id}` label.
- **CLI flags**: `--audience <id>` on `draft-file` and `send-file` commands.
- **Inheritance**: Audiences inherit `from_name`, `from_email`, `reply_to` from product level when not set.

### Monorepo Filtering

For monorepos with multiple products, use the `filter` block to scope activity gathering per product. All filter fields are optional — omitting the `filter` block gathers all repo activity (default behavior).

- **`paths`**: Filters PRs by checking changed files (via `pulls.listFiles`) — only PRs touching files under these prefixes are included. Also scopes fallback commits to these paths. Easiest option, no labeling workflow needed.
- **`labels`**: PRs are fetched via GitHub Search API filtered by these labels (single API call). More efficient than `paths` but requires PRs to be labeled. When both `labels` and `paths` are set, `labels` is used for PRs.
- **`tag_prefix`**: Releases are filtered to only include those whose tag starts with this prefix (e.g. `"admin/"` matches `"admin/v1.2.0"`).

The deprecated `product_filter` string field is treated as `{ labels: [product_filter] }` for backward compatibility.

## Environment Variables

Required across entry points (not all needed for every entry point):

```
GITHUB_TOKEN
FROM_EMAIL, FROM_NAME
CRYYER_REPO          # "owner/repo" for draft issue creation
CRYYER_ROOT          # Project root path (MCP server only; defaults to cwd)
ISSUE_NUMBER         # Set by GitHub Actions for send-on-close
GITHUB_REPOSITORY    # Set by GitHub Actions
```

### Email Provider Configuration

```
EMAIL_PROVIDER       # "resend" (default) or "gmail"
# Resend (default):
RESEND_API_KEY       # Required when EMAIL_PROVIDER=resend (or unset)
# Gmail:
GMAIL_REFRESH_TOKEN  # Required when EMAIL_PROVIDER=gmail; set via "cryyer auth gmail"
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

Default models per provider: Anthropic → `claude-sonnet-4-5-20250514`, OpenAI → `gpt-4o`, Gemini → `gemini-1.5-flash`.

## GitHub Workflows

### CI & deployment
- **`ci.yml`**: Runs on push/PR to main. Lints, typechecks, and runs tests.
- **`deploy-site.yml`**: Deploys docs site to Vercel when `site/**` changes on main.

### Release pipeline (automated, file-based)
- **`release-please.yml`**: Runs on push to main. Opens/updates a version-bump PR with changelog.
- **`draft-email.yml`**: Runs when a `release-please--*` PR is opened/synced. Generates `drafts/vX.Y.Z.md` via LLM and commits it to the PR branch. Uses Gemini.
- **`release.yml`**: Runs on `v*` tag push (created when the release-please PR is merged). Typechecks, tests, publishes to npm, updates major version tag.
- **`send-email.yml`**: Runs when a GitHub Release is published. Reads the draft file and sends emails to subscribers via Resend.

### Weekly pipeline (manual review, issue-based)
- **`weekly-draft.yml`**: Cron Monday 1pm UTC (or manual trigger). Runs `node dist/draft.js` — gathers activity, generates LLM drafts, creates GitHub issues with `draft` + product-id labels. Needs `GITHUB_TOKEN`, `CRYYER_REPO`, and LLM API key.
- **`send-update.yml`**: Fires on issue close (filtered to `draft` label). Runs `node dist/send-on-close.js` — parses issue body, sends emails, posts delivery stats. Needs email provider and subscriber store secrets.

## Composite GitHub Actions

Reusable composite actions that consumer repos reference directly. `cryyer init` can scaffold thin wrapper workflows that use these actions.

### `atriumn/cryyer/.github/actions/draft-file@v0`

Wraps `cryyer draft-file`. Computes `--since` from the previous git tag if not provided.

| Input | Required | Default | Description |
|---|---|---|---|
| `product` | yes | — | Product ID (matches `products/*.yaml`) |
| `version` | yes | — | Release version (used in default output path) |
| `llm-api-key` | yes | — | API key for the LLM provider |
| `since` | no | auto (prev tag) | ISO date or git ref for activity window start |
| `repo` | no | — | Override repo from product config |
| `output` | no | `drafts/v{version}.md` | Output file path |
| `llm-provider` | no | `anthropic` | LLM provider (anthropic, openai, gemini) |
| `llm-model` | no | — | Override default LLM model |
| `audience` | no | — | Audience ID for multi-audience products |
| `github-token` | no | `${{ github.token }}` | GitHub token for API access |
| `cryyer-version` | no | `latest` | Cryyer package version |

**Output:** `draft-path` — path to the generated draft file.

### `atriumn/cryyer/.github/actions/send-file@v0`

Wraps `cryyer send-file`. Maps all credential inputs to env vars for email and subscriber store factories.

| Input | Required | Default | Description |
|---|---|---|---|
| `product` | yes | — | Product ID |
| `draft-path` | yes | — | Path to the draft markdown file |
| `from-email` | yes | — | Sender email address |
| `email-provider` | no | `resend` | Email provider (resend, gmail) |
| `email-api-key` | no | — | Resend API key |
| `gmail-refresh-token` | no | — | Gmail OAuth refresh token |
| `from-name` | no | `Cryyer Updates` | Sender display name |
| `subscriber-store` | no | `json` | Subscriber store (json, supabase, google-sheets) |
| `supabase-url` | no | — | Supabase project URL |
| `supabase-service-key` | no | — | Supabase service role key |
| `google-sheets-spreadsheet-id` | no | — | Google Sheets spreadsheet ID |
| `google-service-account-email` | no | — | Google service account email |
| `google-private-key` | no | — | Google service account private key |
| `audience` | no | — | Audience ID for multi-audience products |
| `dry-run` | no | `false` | Preview without sending |
| `cryyer-version` | no | `latest` | Cryyer package version |

## Conventions

- ESM modules (`"type": "module"` in package.json), imports use `.js` extensions
- TypeScript strict mode, target ES2022, module Node16
- Shared types in `src/types.ts` — includes `Audience`, `ResolvedAudience`, `resolveAudiences()`, `subscriberKey()`
- `repo` is the preferred field in product YAML; `githubRepo` is deprecated
- Bot activity (dependabot, renovate, github-actions) is filtered out in `gather.ts`
- LLM provider is configurable via `LLM_PROVIDER` env var; defaults to Anthropic Claude
- Default model per provider can be overridden via `LLM_MODEL` env var
- Email provider is configurable via `EMAIL_PROVIDER` env var; defaults to Resend
- Subscriber store is configurable via `SUBSCRIBER_STORE` env var; defaults to Supabase
- `dist/` is gitignored and never committed; run `pnpm run build` to generate it
- pnpm is the canonical package manager; `package-lock.json` is gitignored
- Product configs in `products/*.yaml` are gitignored except `products/example.yaml`

## Renamed Symbols

The following were renamed to remove "weekly" from generic pipeline code:

- `gatherWeeklyActivity` → `gatherActivity` (in `gather.ts`)
- `sendWeeklyEmails` → `sendEmails` (in `send.ts`)
- `WeeklyUpdate` → `Update` (type in `types.ts`)
- MCP prompt `review_weekly_drafts` → `review_drafts` (in `mcp.ts`)

## Removed Files

The following files were deprecated and have been removed from `src/`:

- `db.ts` — replaced by `subscriber-store.ts` (removed in #39)
- `subscribers.ts` — replaced by `subscriber-store.ts` (removed in #39)
- `llm.ts` — replaced by `llm-provider.ts` (removed in #40)
- `email.ts` — thin Resend wrapper, unused (removed in #40)
- `github.ts` — thin Octokit wrapper, unused (removed in #40)
