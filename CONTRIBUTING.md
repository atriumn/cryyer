# Contributing to Cryyer

Thank you for your interest in contributing to Cryyer! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 20 or later
- pnpm (npm alternatives not supported to avoid lockfile drift)

### Clone and Install

```bash
git clone https://github.com/atriumn/cryyer.git
cd cryyer
pnpm install
```

### Build and Test

```bash
pnpm run build        # Compile TypeScript to dist/
pnpm run typecheck    # Type-check without emitting
pnpm run lint         # Run ESLint on src/
pnpm test             # Run unit tests (vitest)
pnpm run test:watch   # Run tests in watch mode
```

### Running Locally

**Full pipeline** (gather → draft → send):

```bash
pnpm run build
pnpm start
```

**Individual stages:**

```bash
node dist/draft.js         # Generate drafts and create GitHub issues
node dist/send-on-close.js # Send emails when a draft issue is closed
```

**MCP Server** (for Claude Desktop):

```bash
pnpm run build
pnpm run mcp  # Runs node dist/mcp.js
```

## Code Style and Conventions

### Language & Format

- **Module system**: ESM (ES modules) only — all imports must use `.js` extensions
- **TypeScript**: Strict mode enabled, target ES2022, module Node16
- **Formatting**: ESLint enforced; run `pnpm run lint` before committing

### Key Conventions

- **Adapter pattern**: Pluggable LLM providers (Anthropic, OpenAI, Gemini) and subscriber stores (Supabase, JSON, Google Sheets)
- **Two-stage pipeline**: Weekly draft generation → send on issue close
- **Shared types**: All shared TypeScript types live in `src/types.ts`
- **Product configuration**: YAML-based product configs in `products/` using `repo` field (not deprecated `githubRepo`)
- **Bot filtering**: Automated commits (dependabot, renovate, github-actions) are filtered out in activity gathering

## Making Changes

### 1. Branch and Commit

Create a feature branch with an issue reference:

```bash
git checkout -b feat/#30-my-feature
```

Make atomic commits with clear messages:

```bash
git commit -m "feat(#30): add missing package.json fields for npm"
```

Or for bug fixes:

```bash
git commit -m "fix(#41): update example.yaml to use repo field"
```

### 2. Verify Your Changes

Before pushing, ensure all checks pass:

```bash
pnpm run lint       # ESLint
pnpm run typecheck  # TypeScript type-checking
pnpm test           # Unit tests (vitest)
```

All tests must pass. If you encounter test failures, investigate and fix them.

### 3. Pull Request Process

- **Title**: Reference the issue (e.g., `fix(#30): complete package.json metadata`)
- **Description**: Explain the _why_, not just the _what_
- **Checklist**:
  - Tests pass locally
  - ESLint passes
  - TypeScript typechecks
  - Commits are atomic and well-described

The CI workflow (`ci.yml`) runs on all PRs to main and must pass before merge.

## Architecture Overview

### Entry Points

Cryyer has four distinct entry points, each compiled from `src/` to `dist/`:

| File | Purpose |
|---|---|
| `index.ts` | Direct orchestration: gather → draft → send in one run |
| `draft.ts` | Used by `weekly-draft.yml` workflow; gathers activity and creates draft issues |
| `send-on-close.ts` | Used by `send-update.yml` workflow; sends emails when issues close |
| `mcp.ts` | MCP server for Claude Desktop; exposes tools and prompts |

### Key Modules

| Module | Role |
|---|---|
| `config.ts` | Loads env vars, discovers and parses `products/*.yaml` |
| `gather.ts` | Fetches merged PRs, releases, and commits via Octokit; filters bots |
| `llm-provider.ts` | LLMProvider interface and factory; adapters for multiple providers |
| `summarize.ts` | Builds prompt with product voice and calls LLM |
| `subscriber-store.ts` | SubscriberStore interface and factory; multiple backend support |
| `send.ts` | Sends batch emails via Resend with HTML template wrapping |

### Product Configuration

Products are YAML files in `products/`. Minimal example:

```yaml
id: my-app
name: My App
repo: owner/repo
emailSubjectTemplate: "My App — Week of {{weekOf}}"
voice: |
  You are writing a weekly update email for My App beta testers.
  Be concise, friendly, and focus on what matters to users.
```

See README for full field documentation.

## Environment Variables

### Common

```
GITHUB_TOKEN           # GitHub API token
RESEND_API_KEY         # Resend API key for email delivery
FROM_EMAIL             # Default sender email
FROM_NAME              # Default sender name
```

### LLM Provider (choose one)

```
LLM_PROVIDER          # "anthropic" (default), "openai", or "gemini"
LLM_MODEL             # Override default model
ANTHROPIC_API_KEY     # For Anthropic
OPENAI_API_KEY        # For OpenAI
GEMINI_API_KEY        # For Google Gemini
```

### Subscriber Store (choose one)

**Supabase** (default):
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

**JSON file**:
```
SUBSCRIBER_STORE=json
SUBSCRIBERS_JSON_PATH        # Default: ./subscribers.json
EMAIL_LOG_JSON_PATH          # Default: ./email-log.json
```

**Google Sheets**:
```
SUBSCRIBER_STORE=google-sheets
GOOGLE_SHEETS_SPREADSHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

### Workflow-Specific

```
CRYYER_REPO           # "owner/repo" for draft issue creation
CRYYER_ROOT           # Project root (MCP server only)
ISSUE_NUMBER          # Set by GitHub Actions in send-on-close workflow
GITHUB_REPOSITORY     # Set by GitHub Actions
```

See `.env.example` for a complete template.

## Testing

- **Framework**: Vitest
- **Command**: `pnpm test`
- **Watch mode**: `pnpm run test:watch`

Tests must pass before committing. If adding new features, include tests.

## Issue Reporting

When reporting an issue:

1. **Search first**: Check if the issue already exists
2. **Be specific**: Describe the problem, steps to reproduce, and expected behavior
3. **Include environment**: Node version, OS, pnpm version
4. **Provide logs**: Paste relevant error messages or logs

Use the bug report template when opening an issue on GitHub.

## Questions or Need Help?

- Open a discussion or issue on [GitHub](https://github.com/atriumn/cryyer)
- Check existing issues and the README for answers

Thank you for contributing! 🙏
