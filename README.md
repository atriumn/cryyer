<p align="center">
  <img src="cryyer-transparent.png" alt="Cryyer" width="200">
</p>

# Cryyer

<p align="center">
  <a href="https://github.com/atriumn/cryyer/actions/workflows/ci.yml"><img src="https://github.com/atriumn/cryyer/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://www.npmjs.com/package/cryyer"><img src="https://img.shields.io/npm/v/cryyer.svg" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="./package.json"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node.js >= 20"></a>
</p>

Automated weekly email updates for beta testers, with per-product voice powered by LLM-drafted content.

**Website**: [cryyer.dev](https://cryyer.dev)
**GitHub**: [atriumn/cryyer](https://github.com/atriumn/cryyer)
**Issues**: [Report a bug](https://github.com/atriumn/cryyer/issues)

Cryyer follows a two-stage pipeline:

1. **Weekly Draft** (cron, Mondays) — gathers GitHub activity (merged PRs, releases, notable commits), generates an email draft via LLM, and creates a GitHub issue for human review.
2. **Send on Close** — when a draft issue is closed (approved), emails are sent to subscribers via [Resend](https://resend.com).

## Quickstart

```bash
pnpm install
```

### 1. Create a product config

Create a YAML file in `products/` (e.g. `products/my-app.yaml`):

```yaml
id: my-app
name: My App
repo: owner/repo
emailSubjectTemplate: "My App — Week of {{weekOf}}"
voice: |
  You are writing a weekly update email for My App beta testers.
  Be concise, friendly, and focus on what matters to users.
```

See [Product Configuration](#product-configuration) for all fields.

### 2. Add subscribers

Choose a [subscriber store](#subscriber-stores) — the simplest for local dev is JSON:

```bash
export SUBSCRIBER_STORE=json
```

Create `subscribers.json` (see [`subscribers.example.json`](./subscribers.example.json)):

```json
[
  { "email": "alice@example.com", "name": "Alice", "productIds": ["my-app"] },
  { "email": "bob@example.com", "productIds": ["my-app"] }
]
```

### 3. Set environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

At minimum you need:

```bash
GITHUB_TOKEN=ghp_...
RESEND_API_KEY=re_...
FROM_EMAIL=updates@yourdomain.com
LLM_PROVIDER=anthropic          # or openai, gemini
ANTHROPIC_API_KEY=sk-ant-...    # key for your chosen provider
```

See [`.env.example`](./.env.example) for all variables and their descriptions.

### 4. Run

```bash
pnpm run build
pnpm start             # full pipeline: gather → draft → send
```

Or run the two stages separately:

```bash
node dist/draft.js         # generate drafts → create GitHub issues
node dist/send-on-close.js # send emails when a draft issue is closed
```

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

Default models: Anthropic `claude-3-5-haiku-latest`, OpenAI `gpt-4o`, Gemini `gemini-1.5-flash`.

## Product Configuration

Products are defined as YAML files in `products/`. Each file represents one product.

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier, also used as GitHub issue label |
| `name` | Yes | Display name |
| `voice` | Yes | LLM voice/tone instructions (injected into the draft prompt) |
| `repo` | Yes | `owner/repo` for GitHub activity gathering |
| `emailSubjectTemplate` | Yes | Subject line template — use `{{weekOf}}` for the date |
| `tagline` | No | Product tagline |
| `from_name` | No | Override sender name for this product |
| `from_email` | No | Override sender email for this product |
| `reply_to` | No | Reply-to address |

## GitHub Actions Workflows

### `weekly-draft.yml`

Runs every Monday at 1pm UTC. Gathers GitHub activity and creates draft issues.

Secrets needed: `GITHUB_TOKEN`, `CRYYER_REPO`, and the API key for your chosen `LLM_PROVIDER`.

### `send-update.yml`

Fires when an issue with the `draft` label is closed. Sends emails to subscribers.

Secrets needed: `GITHUB_TOKEN`, `RESEND_API_KEY`, `FROM_EMAIL`, plus the secrets for your chosen `SUBSCRIBER_STORE`.

### `ci.yml`

Runs on push/PR to main. Lints, typechecks, and runs tests.

## MCP Server (Claude Desktop)

Cryyer includes an MCP server that lets you review, edit, and send drafts conversationally in Claude Desktop. It also supports subscriber management.

### Setup

```bash
npm run build   # compiles dist/mcp.js
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "cryyer": {
      "command": "node",
      "args": ["/path/to/beacon/dist/mcp.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_...",
        "CRYYER_REPO": "owner/repo",
        "CRYYER_ROOT": "/path/to/beacon",
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

Only `GITHUB_TOKEN` and `CRYYER_REPO` are needed for read-only tools (`list_drafts`, `get_draft`). Other env vars are needed for sending, regenerating, and subscriber management.

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

Use the `review_weekly_drafts` prompt for the Monday morning review workflow — it walks through each pending draft and asks whether to send, edit, regenerate, or skip.

## Development

```bash
pnpm install         # install dependencies
pnpm run build       # compile TypeScript
pnpm run typecheck   # type-check without emitting
pnpm run lint        # ESLint
pnpm test            # run tests (vitest)
pnpm run test:watch  # run tests in watch mode
pnpm run dev         # build + run
pnpm run mcp         # run MCP server
```
