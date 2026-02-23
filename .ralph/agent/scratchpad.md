# Scratchpad — Issue #5: Build LLM draft generator

## Objective
Create `src/summarize.ts` — calls Claude API to generate a beta tester email draft returning `{ subject, body }`.

## Plan

### Requirements
- Accept: Product config (name, voice), GatheredActivity (weekly data), weekOf, optional previousUpdate
- Build prompt with: product name, voice instructions, formatted activity, previous update context
- Call Claude Haiku by default (Sonnet as option)
- Return `{ subject: string, body: string }`
- Edge case: no activity → quiet week update or what's coming teaser

### Approach
- Use GatheredActivity type from gather.ts for the weekly data
- Format PRs, releases, commits into readable sections
- Ask Claude to return structured JSON with subject + body
- Parse the JSON response robustly

## Tasks
- [x] Create src/summarize.ts
- [ ] Run typecheck and verify

## Notes
- No ESLint config in project, lint will be skipped
- No test files exist
- tsconfig uses Node16 module resolution — must use .js extensions in imports
