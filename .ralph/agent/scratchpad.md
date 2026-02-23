# Scratchpad

## Objective
Implement Issue #4: Build GitHub activity gatherer (`src/gather.ts`)

## Requirements
- Accept a product config (repo name, date range)
- Use Octokit to fetch merged PRs, releases, and optionally commits
- Return `{ prs: [...], releases: [...], commits: [...] }`
- Handle repos with no activity gracefully
- Filter out bot/dependabot PRs

## Plan
1. [x] Study codebase (types.ts, github.ts, index.ts, package.json)
2. [ ] Create `src/gather.ts` with:
   - `GatheredActivity` return type interface
   - `PR`, `Release`, `Commit` interfaces
   - `gatherWeeklyActivity(octokit, product, since)` function
   - Filter dependabot/bot PRs
   - Fetch commits only if no PRs/releases
3. [ ] Run typecheck
4. [ ] Commit

## Notes
- Project uses ESM with Node16 module resolution
- No test framework configured (no test script in package.json)
- Uses octokit v4
