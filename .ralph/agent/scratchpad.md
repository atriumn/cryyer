# Scratchpad — Issue #3: Project scaffolding

## Objective
Set up initial project structure for beacon: centralized beta tester update system with automated weekly emails and per-product LLM-drafted voice.

## Plan
- [x] Create scratchpad
- [ ] Create package.json with required dependencies
- [ ] Create tsconfig.json
- [ ] Create .gitignore
- [ ] Create src/ directory structure
- [ ] Create products/ directory
- [ ] Create templates/ directory
- [ ] Create CLAUDE.md
- [ ] Run npm install
- [ ] Verify TypeScript compiles
- [ ] Commit

## Notes
- Dependencies: octokit, @anthropic-ai/sdk, resend, @supabase/supabase-js, yaml
- Cannot access atriumn/arqo#1 for directory structure plan — will infer from project description
- Beacon: weekly emails to beta testers, per-product voice via LLM
- src/ structure: index.ts, github.ts, email.ts, llm.ts, db.ts, types.ts, scheduler.ts
- products/ will have YAML config files per product
- templates/ will have email template files
