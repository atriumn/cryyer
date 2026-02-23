# Objective: Build send-on-close workflow (#10)

## Plan

Create `.github/workflows/send-update.yml` triggered when draft issues are closed.
Also create `src/send-on-close.ts` as the Node.js script that does the actual work.

## Issue Body Format (from draft.ts)

```
**Subject:** ${subject}

---

${body}
```

## Key Facts

- Draft issues have labels: `['draft', product.id]`
- `subscribers.ts`: `getSubscribers(db, productId)` returns `Subscriber[]` (`{email, name?}`)
- `send.ts`: `sendWeeklyEmails(resend, product, betaTesters, content, fromName, fromEmail)` returns `DeliveryStats`
- `BetaTester` type has `id, email, name, productIds` - need to adapt from `Subscriber`
- `GITHUB_REPOSITORY` is a default env var in GH Actions (format: `owner/repo`)

## Steps

- [x] Create src/send-on-close.ts
- [x] Create .github/workflows/send-update.yml
- [ ] Typecheck
- [ ] Commit
