# Scratchpad: Issue #11 - Configure repo secrets and access

## Objective
Implement Issue #11: Configure repository secrets and access for the Beacon project to operate.

## Understanding
The beacon project needs:
1. **GitHub repository secrets** (for CI/CD to access APIs):
   - `ANTHROPIC_API_KEY` — for Claude API draft generation
   - `RESEND_API_KEY` — for email delivery
   - `SUPABASE_URL` — beacon's Supabase project URL
   - `SUPABASE_SERVICE_KEY` — service role key for subscriber queries

2. **GitHub token access**:
   - `GITHUB_TOKEN` must have read access to multiple repos (atriumn/idynic, atriumn/celiumn, etc.)
   - May need fine-grained PAT or GitHub App instead of standard token

3. **Documentation**:
   - Document which Supabase project is being used in the codebase or README

## Tasks Created
1. task-1771864849-e9fe: Update config to use SUPABASE_SERVICE_KEY (Priority 1)
2. task-1771864852-716f: Document GitHub secrets configuration in README (Priority 2)

## Analysis
- Current code uses `SUPABASE_KEY` but issue requires `SUPABASE_SERVICE_KEY`
- Need to update config.ts and CLAUDE.md documentation
- Need to document the secrets in README with setup instructions
- The GitHub UI/`gh secret set` steps are manual and don't need code changes

## Implementation Plan

### Task 1: Update config to use SUPABASE_SERVICE_KEY
- Update src/config.ts: Change `supabaseKey` to `supabaseServiceKey`
- Update CLAUDE.md Environment Variables section
- Update any other references in the codebase

### Task 2: Document secrets in README
- Add a "Setup" or "Configuration" section to README
- List all required secrets and what they're for
- Include instructions for setting them via `gh secret set`
- Document which Supabase project is being used (will be manual input)

## Progress
- [x] Initial exploration complete
- [x] Tasks created
- [ ] Implementing Task 1...
