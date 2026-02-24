# cryer
Centralized beta tester update system — automated weekly emails with per-product voice powered by LLM drafts

## Setup

### Environment Configuration
Cryer requires the following environment variables to operate. These must be set as GitHub repository secrets for CI/CD workflows, or as environment variables for local development.

#### Required Secrets

1. **`GITHUB_TOKEN`**
   - Purpose: Read access to GitHub repositories for activity gathering
   - Requirements: Must have read permissions on:
     - `atriumn/cryer` (this repository)
     - `atriumn/idynic`
     - `atriumn/celiumn`
     - Any other product repositories
   - Setup: Use a fine-grained Personal Access Token (PAT) with repository read permissions if the default token scope is insufficient
   - Set via: `gh secret set GITHUB_TOKEN`

2. **`ANTHROPIC_API_KEY`**
   - Purpose: Claude API for LLM-drafted email content generation
   - Obtain from: [Anthropic Console](https://console.anthropic.com)
   - Set via: `gh secret set ANTHROPIC_API_KEY`

3. **`RESEND_API_KEY`**
   - Purpose: Transactional email delivery service
   - Obtain from: [Resend Dashboard](https://resend.com)
   - Set via: `gh secret set RESEND_API_KEY`

4. **`SUPABASE_URL`**
   - Purpose: Supabase project URL for database and authentication
   - Format: `https://[project-id].supabase.co`
   - Obtain from: Supabase project dashboard
   - Set via: `gh secret set SUPABASE_URL`

5. **`SUPABASE_SERVICE_KEY`**
   - Purpose: Supabase service role key for server-side database operations (beta tester queries, email logging)
   - Warning: This is a service role key with elevated permissions — keep it secret and only use in server-side contexts
   - Obtain from: Supabase project dashboard (Settings > API Keys > Service role key)
   - Set via: `gh secret set SUPABASE_SERVICE_KEY`

6. **`FROM_EMAIL`**
   - Purpose: Sender email address for outgoing emails
   - Format: A verified email address in your Resend account
   - Set via: `gh secret set FROM_EMAIL`

#### Setting Secrets via GitHub CLI
```bash
gh secret set GITHUB_TOKEN
gh secret set ANTHROPIC_API_KEY
gh secret set RESEND_API_KEY
gh secret set SUPABASE_URL
gh secret set SUPABASE_SERVICE_KEY
gh secret set FROM_EMAIL
```

#### Documentation
- **Supabase Project**: Cryer uses the Supabase project at `https://[project-id].supabase.co` (set via `SUPABASE_URL` secret)
- For detailed environment variable documentation, see [CLAUDE.md](./CLAUDE.md)
