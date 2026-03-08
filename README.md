<p align="center">
  <img src="cryyer-transparent.png" alt="Cryyer" width="200">
</p>

# Cryyer

<p align="center">
  <a href="https://github.com/atriumn/cryyer/actions/workflows/ci.yml"><img src="https://github.com/atriumn/cryyer/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://www.npmjs.com/package/@atriumn/cryyer"><img src="https://img.shields.io/npm/v/@atriumn/cryyer.svg" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="./package.json"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node.js >= 20"></a>
</p>

Automated product update emails, with per-product voice powered by LLM-drafted content. Supports multiple audiences per product, multiple LLM providers (Anthropic, OpenAI, Gemini), and multiple email providers (Resend, Gmail).

**Website**: [cryyer.dev](https://cryyer.dev)
**GitHub**: [atriumn/cryyer](https://github.com/atriumn/cryyer)
**Issues**: [Report a bug](https://github.com/atriumn/cryyer/issues)

Cryyer supports two pipelines:

**Release pipeline** (manual approval before send):
1. Push to `main` → release-please opens a version-bump PR
2. `draft-email.yml` generates a draft file (`drafts/vX.Y.Z.md`) and commits it to the PR branch
3. Merge the PR → tag pushed → `release.yml` publishes to npm → GitHub Release created
4. `send-email.yml` fires on release publish but **pauses for approval** — review the draft, then approve to send

**Weekly pipeline** (manual review via GitHub issues):
1. `weekly-draft.yml` runs on cron (Monday 1pm UTC) — gathers GitHub activity, generates LLM drafts, creates GitHub issues for human review
2. `send-update.yml` fires when a draft issue is closed — sends emails to subscribers

## Quickstart

### For humans — interactive wizard

```bash
mkdir my-updates && cd my-updates
npx @atriumn/cryyer init
```

The interactive setup walks you through product name, GitHub repo, voice/tone, LLM provider, subscriber store, and API keys — then creates everything you need:

- `products/*.yaml` — product configuration
- `.env` — API keys and settings
- `subscribers.json` — subscriber list (when using JSON store)
- `.gitignore` — ignores `.env` and data files

### For CI — flags + env vars

```bash
npx @atriumn/cryyer init --yes \
  --product "My App" \
  --repo owner/my-app \
  --voice "Friendly and concise" \
  --pipeline weekly
```

Non-interactive mode (`--yes` or `CI=true`) skips all prompts. Secrets are read from environment variables (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, etc.) instead of being written to `.env`. Defaults: `anthropic` LLM, `json` subscriber store, `resend` email, no workflows.

Available flags: `--product`, `--repo`, `--voice`, `--llm`, `--subscriber-store`, `--email-provider`, `--from-email`, `--pipeline` (`weekly`, `release`, or `both`).

### For agents — write files directly

AI coding agents (Claude Code, Cursor, etc.) can skip `init` entirely and write the files themselves. All you need is a `products/*.yaml` file — see [Product Configuration](#product-configuration) for the schema.

Then:

```bash
npx @atriumn/cryyer check         # validate your setup
npx @atriumn/cryyer run --dry-run  # preview a draft email
```

When you're ready to run for real:

```bash
npx @atriumn/cryyer run          # full pipeline: gather → draft → send
```

Or run the two stages separately:

```bash
npx @atriumn/cryyer draft        # generate drafts → create GitHub issues
npx @atriumn/cryyer send         # send emails when a draft issue is closed
```

For release-triggered emails, use the file-based commands:

```bash
npx @atriumn/cryyer draft-file --product my-app --version 1.2.0  # generate a draft file
npx @atriumn/cryyer send-file drafts/v1.2.0.md --product my-app  # send from draft file
```

You can also create `products/*.yaml` files manually — see [Product Configuration](#product-configuration) for all fields, and [`.env.example`](./.env.example) for all environment variables.

## Subscriber Stores

Set `SUBSCRIBER_STORE` to choose your backend. Default is `supabase`.

### JSON File (simplest)

```bash
SUBSCRIBER_STORE=json
```

| Variable | Default | Description |
|---|---|---|
| `SUBSCRIBERS_JSON_PATH` | `./subscribers.json` | Path to subscriber data |
| `EMAIL_LOG_JSON_PATH` | `./email-log.json` | Path to email send log |

File format — array of objects with `email`, optional `name`, and `productIds`:

```json
[
  { "email": "alice@example.com", "name": "Alice", "productIds": ["my-app", "other-app"] }
]
```

> **Public repos:** Don't use the JSON store if your repo is public — `subscribers.json` would need to be committed, exposing subscriber emails. Use the [GitHub Gist store](#github-gist) instead.

### GitHub Gist

Stores subscribers in a private GitHub Gist — same JSON format as the JSON file store, but private. Ideal for public repos.

```bash
SUBSCRIBER_STORE=gist
```

| Variable | Description |
|---|---|
| `GITHUB_GIST_ID` | ID of a private Gist containing `subscribers.json` |
| `GITHUB_TOKEN` | Classic PAT with `gist` scope (fine-grained PATs do not support gists; the default Actions token cannot access private gists) |

**Setup:**

1. Create a [secret Gist](https://gist.github.com/) with a file named `subscribers.json` containing `[]`
2. Copy the Gist ID from the URL
3. Create a [classic PAT](https://github.com/settings/tokens/new) with `gist` scope (fine-grained PATs don't work with gists)
4. Add both as repo secrets (`SUBSCRIBERS_GIST_ID`, `SUBSCRIBERS_GIST_TOKEN`)

Same file format as the JSON store:

```json
[
  { "email": "alice@example.com", "name": "Alice", "productIds": ["my-app"] }
]
```

When using [audiences](https://cryyer.dev/configuration/product-config#audiences), use compound keys in `productIds` (e.g. `"my-app:beta"`).

### Supabase (default)

```bash
SUBSCRIBER_STORE=supabase  # or just don't set it
```

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (`https://[project-id].supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

Expects a `beta_testers` table with columns: `email`, `name`, `product`, `unsubscribed_at`.

### Google Sheets

```bash
SUBSCRIBER_STORE=google-sheets
```

| Variable | Description |
|---|---|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | The ID from your spreadsheet URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key (PEM format) |

Cryyer looks for a sheet tab named after the product ID (e.g. `my-app`), falling back to the first sheet. Expected columns: `email`, `name` (optional), `unsubscribed` (optional, set to `true` to exclude).

Email send logging is a no-op with this backend (read-only).

<details>
<summary><strong>Google Sheets setup walkthrough</strong></summary>

#### 1. Enable the Google Sheets API

- Go to [console.cloud.google.com](https://console.cloud.google.com) (create a project if you don't have one)
- Navigate to **APIs & Services > Library**
- Search for "Google Sheets API" and click **Enable**

#### 2. Create a service account

- Go to **APIs & Services > Credentials**
- Click **Create Credentials > Service account**
- Name it (e.g. `cryyer-sheets-reader`) and click **Done**

#### 3. Generate a key

- Click the service account you just created
- Go to the **Keys** tab
- Click **Add Key > Create new key > JSON**
- Save the downloaded file

#### 4. Set your environment variables

From the downloaded JSON file, grab `client_email` and `private_key`:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=cryyer-sheets-reader@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

#### 5. Get the spreadsheet ID

From the spreadsheet URL:

```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
                                       ^^^^^^^^^^^^^^^^^^^^
```

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

#### 6. Share the spreadsheet

Share the spreadsheet with your service account email (from step 4) as an **Editor** (required for add/remove subscriber support; Viewer is sufficient for read-only use).

#### 7. Set up columns

Row 1 should have these headers:

| email | name | unsubscribed |
|---|---|---|
| alice@example.com | Alice | |
| bob@example.com | Bob | |
| charlie@example.com | | true |

Name the sheet tab after your product ID (e.g. `my-app`), or just use the default first sheet if you have one product.

</details>

## LLM Providers

Set `LLM_PROVIDER` to choose your LLM backend. Default is `anthropic`.

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `anthropic` | `anthropic`, `openai`, or `gemini` |
| `LLM_MODEL` | Per-provider default | Override the default model |
| `ANTHROPIC_API_KEY` | — | Required when `LLM_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | — | Required when `LLM_PROVIDER=openai` |
| `GEMINI_API_KEY` | — | Required when `LLM_PROVIDER=gemini` |

Default models: Anthropic `claude-sonnet-4-5-20250514`, OpenAI `gpt-4o`, Gemini `gemini-1.5-flash`.

## Product Configuration

Products are defined as YAML files in `products/`. Each file represents one product.

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier, also used as GitHub issue label |
| `name` | Yes | Display name |
| `voice` | Yes* | LLM voice/tone instructions (injected into the draft prompt) |
| `repo` | Yes | `owner/repo` for GitHub activity gathering |
| `emailSubjectTemplate` | Yes* | Subject line template — use `{{weekOf}}` for the date or `{{version}}` for the release version |
| `audiences` | No | List of audience-specific overrides (see docs site) |
| `tagline` | No | Product tagline |
| `from_name` | No | Override sender name for this product |
| `from_email` | No | Override sender email for this product |
| `reply_to` | No | Reply-to address |

*\* Required when `audiences` is not set. When using `audiences`, `voice` and `emailSubjectTemplate` are set per-audience instead.*

## GitHub Actions Workflows

### `weekly-draft.yml`

Runs every Monday at 1pm UTC. Gathers GitHub activity and creates draft issues.

Secrets needed: `GITHUB_TOKEN`, `CRYYER_REPO`, and the API key for your chosen `LLM_PROVIDER`.

### `send-update.yml`

Fires when an issue with the `draft` label is closed. Sends emails to subscribers.

Secrets needed: `GITHUB_TOKEN`, email provider credentials (`RESEND_API_KEY` or `GMAIL_REFRESH_TOKEN`), `FROM_EMAIL`, plus the secrets for your chosen `SUBSCRIBER_STORE`.

### `draft-email.yml`

Runs when a `release-please--*` PR is opened or synced. Generates `drafts/vX.Y.Z.md` via LLM and commits it to the PR branch.

### `release.yml`

Runs on `v*` tag push (after release-please PR is merged). Typechecks, tests, publishes to npm, creates GitHub Release.

### `send-email.yml`

Runs when a GitHub Release is published. Reads the draft file and sends emails to subscribers. Pauses for manual approval via a `production` environment with required reviewers.

### `ci.yml`

Runs on push/PR to main. Lints, typechecks, and runs tests.

### Composite Actions

Reusable composite actions for consumer repos: `atriumn/cryyer/.github/actions/draft-file@v0` and `atriumn/cryyer/.github/actions/send-file@v0`. Run `cryyer init` to scaffold wrapper workflows. See the [docs site](https://cryyer.dev) for full input references.

## MCP Server

Cryyer includes an MCP server that lets you review, edit, and send drafts conversationally from any MCP client. It also supports subscriber management.

The MCP server uses stdio transport and is available as a separate binary: `cryyer-mcp`.

### Standalone usage

```bash
npx @atriumn/cryyer-mcp
```

Or if installed locally:

```bash
pnpm run build   # compiles dist/mcp.js
node dist/mcp.js
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "cryyer": {
      "command": "npx",
      "args": ["@atriumn/cryyer-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_...",
        "CRYYER_REPO": "owner/repo",
        "CRYYER_ROOT": "/path/to/cryyer",
        "RESEND_API_KEY": "re_...",
        "FROM_EMAIL": "updates@example.com",
        "SUBSCRIBER_STORE": "json",
        "LLM_PROVIDER": "anthropic",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Other MCP clients (Cline, Continue, Windsurf, etc.)

Any MCP client that supports stdio transport can use Cryyer. The generic config is:

- **Command**: `npx @atriumn/cryyer-mcp` (or `node /path/to/cryyer/dist/mcp.js`)
- **Transport**: stdio
- **Environment variables**: same as above

Only `GITHUB_TOKEN` and `CRYYER_REPO` are needed for read-only tools (`list_drafts`, `get_draft`). Other env vars are needed for sending, regenerating, and subscriber management.

### Debugging

Test the server interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/mcp.js
```

All log output goes to stderr (stdout is reserved for JSON-RPC). If something isn't working, check stderr for error messages.

### Tools

| Tool | Description |
|---|---|
| `list_drafts` | List open draft issues |
| `get_draft` | Get full draft content with subscriber count |
| `update_draft` | Save revised subject + body |
| `send_draft` | Send emails, close issue, post stats |
| `regenerate_draft` | Re-gather activity + re-draft via LLM |
| `list_products` | Show configured products |
| `list_subscribers` | Show subscribers for a product |
| `add_subscriber` | Add a subscriber to a product |
| `remove_subscriber` | Unsubscribe someone from a product |

### Prompt

Use the `review_drafts` prompt for the Monday morning review workflow — it walks through each pending draft and asks whether to send, edit, regenerate, or skip.

## Badge

Show that your project uses Cryyer for emails:

[![Emails by Cryyer](https://img.shields.io/badge/emails%20by-cryyer-2c3e6b?style=flat&logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABEElEQVR42r2UIU4EQRREq2bWrSIIAgmCYJCbgMESNIYDLHfgEnAJFAdAYUCgOAUCgYWsJGRnH4KaMDuZzO6GLN%2F83%2Bn%2B1b%2Bq0i39RwAlUPwVpGgBOrWXBagbhsA1cNjcKwuvBFYmP%2FITt8BBc9KlwIBB8jm%2FsQ%2BMgQdgGyh6wQDn0A5wF5AbYBeYZD2y53XsFLksJOA%2BTRXwCrxlfdmkv0joTeADmAKzBr2X%2BrI2rfZo9S2nkjZSW9I09XMNYJs%2BoHrzS9J76pmkgaQrSeMAs4r1F6HzmXzWdLQdXao75PckVaFVSTrps7vTvsw9imbD5KPo0knLXc7ZBjiWtJVGS5rYflr7T%2BEFr9%2Fz4rla%2B0TfpaQEQwE4wDoAAAAASUVORK5CYII%3D)](https://github.com/atriumn/cryyer)

```md
[![Emails by Cryyer](https://img.shields.io/badge/emails%20by-cryyer-2c3e6b?style=flat&logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABEElEQVR42r2UIU4EQRREq2bWrSIIAgmCYJCbgMESNIYDLHfgEnAJFAdAYUCgOAUCgYWsJGRnH4KaMDuZzO6GLN%2F83%2Bn%2B1b%2Bq0i39RwAlUPwVpGgBOrWXBagbhsA1cNjcKwuvBFYmP%2FITt8BBc9KlwIBB8jm%2FsQ%2BMgQdgGyh6wQDn0A5wF5AbYBeYZD2y53XsFLksJOA%2BTRXwCrxlfdmkv0joTeADmAKzBr2X%2BrI2rfZo9S2nkjZSW9I09XMNYJs%2BoHrzS9J76pmkgaQrSeMAs4r1F6HzmXzWdLQdXao75PckVaFVSTrps7vTvsw9imbD5KPo0knLXc7ZBjiWtJVGS5rYflr7T%2BEFr9%2Fz4rla%2B0TfpaQEQwE4wDoAAAAASUVORK5CYII%3D)](https://github.com/atriumn/cryyer)
```

## Development

```bash
pnpm install         # install dependencies
pnpm run build       # compile TypeScript
pnpm run init        # interactive product setup + .env scaffolding
pnpm run check       # validate config, tokens, and connections
pnpm run typecheck   # type-check without emitting
pnpm run lint        # ESLint
pnpm test            # run tests (vitest)
pnpm run test:watch  # run tests in watch mode
pnpm run dev         # build + run
pnpm run mcp         # run MCP server
```
