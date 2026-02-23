# Scratchpad — Issue #7: Build Supabase subscriber module

## Objective
Create `src/subscribers.ts` and the Supabase migration for `beta_testers` table.

## Plan
- [x] Read existing codebase (db.ts, types.ts, index.ts, send.ts)
- [x] Create `supabase/migrations/20260223000000_create_beta_testers.sql`
- [x] Create `src/subscribers.ts`
- [x] Run typecheck
- [x] Commit (6b48a87)

## Notes
- Project uses npm (not pnpm), no local supabase instance
- `src/db.ts` has `getBetaTesters` using old `productIds` array — the new module uses `product` text column per issue spec
- `src/subscribers.ts` is separate from `db.ts` per issue requirements
- Return type: `{ email: string, name?: string }[]`
