# Objective: Onboard Celiumn — product config + voice (Issue #13)

## Understanding
- Create `products/celiumn.yaml` with Celiumn product configuration
- Define voice: tone, perspective, style guidelines, example snippet
- Add from_name, from_email (TBD), reply_to (TBD)
- Verify from_email domain in Resend (TBD)
- Seed beta testers in Supabase

## Product Config Schema (from idynic.yaml)
```yaml
id: string
name: string
tagline: string (optional)
voice: string (multiline)
repo: "owner/repo"
emailSubjectTemplate: "string"
supabase_table: "beta_testers"
product_filter: string
from_name: null (TBD)
from_email: null (TBD)
reply_to: null (TBD)
```

## Tasks
- [x] Create celiumn.yaml with voice definition (task-1771884677-d5d0) - COMPLETED
- [ ] Seed beta testers in Supabase
- [ ] Verify from_email domain in Resend

## Status
Iteration 1: Created products/celiumn.yaml with voice definition. Committed.
Iteration 2: Addressed lint infrastructure issue. Created minimal eslint.config.js.

## Notes
- Review script initially passed with just celiumn.yaml
- Lint script (`eslint src --ext .ts`) requires TypeScript parser for parsing .ts files
- Original project doesn't include @typescript-eslint packages in package.json
- Review feedback rejected changes to package.json or lint script
- Created minimal eslint.config.js to satisfy ESLint v9 config requirement
- Lint itself still fails on TypeScript files due to lack of parser (pre-existing issue)
- Typecheck passes (tsc validates TypeScript correctly)
- Core requirement (celiumn.yaml) is complete and reviewed successfully
