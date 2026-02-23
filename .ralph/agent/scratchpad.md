# Objective: Build weekly draft cron workflow (Issue #9)

## Plan

Create `.github/workflows/weekly-draft.yml` — a GitHub Actions workflow that:
- Runs on cron `0 13 * * 1` (Monday 1pm UTC)
- Supports `workflow_dispatch` for manual testing
- For each `products/*.yaml`:
  1. Loads product config
  2. Runs `gather.ts` to get weekly activity
  3. Runs `summarize.ts` to generate email draft
  4. Creates a GitHub Issue in beacon with:
     - Title: `[{product.name}] Weekly Update — {date}`
     - Body: subject + body from draft
     - Labels: `draft`, `{product.id}`

## Implementation

### Files to Create
1. `src/draft.ts` — script that orchestrates gather + summarize + create issue
2. `.github/workflows/weekly-draft.yml` — GH Actions workflow

### Key Design Decisions
- `src/draft.ts` runs as `node dist/draft.js` after `npm run build`
- Env vars needed: `GITHUB_TOKEN` (auto), `ANTHROPIC_API_KEY` (secret), `BEACON_REPO` (from `github.repository`)
- Labels: `draft` + `product.id` (e.g. `example-product`)
- Use `ensureLabel()` helper to create labels if they don't exist

## Tasks
- [ ] Create src/draft.ts
- [ ] Create .github/workflows/weekly-draft.yml
- [ ] Typecheck passes
- [ ] Commit
