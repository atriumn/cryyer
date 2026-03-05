# Security Policy

## Reporting a Vulnerability

We take the security of Cryyer seriously. If you discover a security vulnerability, please email **security@atriumn.dev** with details of the vulnerability. Do **not** open a public GitHub issue.

Please include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested patches (if applicable)

We will acknowledge your report within 48 hours and work with you to develop and release a fix.

## Supported Versions

| Version | Status | Security Updates |
|---------|--------|------------------|
| 0.1.x | Current | Yes |

We recommend always running the latest patch version of the branch you're using.

## Security Considerations

### API Keys & Secrets

Cryyer requires several sensitive credentials:

- **GitHub Token**: Needed to read repositories and create draft issues. Use a personal access token with minimal required scopes (`repo`, `issues`).
- **LLM API Keys**: Protect these as you would any authentication credential.
- **Resend API Key / Gmail Refresh Token**: Used to send emails. Rotate if compromised.
- **Supabase/Google Cloud credentials**: Store securely; never commit to version control.

**Best practices**:

1. Store all secrets in `.env` or environment variables
2. Never commit `.env` to git (it's in `.gitignore`)
3. Use GitHub Secrets for CI/CD workflows
4. Rotate credentials periodically
5. Use the least privileged scopes necessary

### Email Privacy

Emails are sent via [Resend](https://resend.com) or Gmail, depending on your `EMAIL_PROVIDER` setting. Subscriber data is stored in your chosen backend (Supabase, JSON file, or Google Sheets).

- Ensure your subscriber store is not publicly accessible
- Use strong authentication on shared backends (Supabase, Google Sheets)
- Consider encrypting sensitive subscriber information

### External Dependencies

Cryyer depends on several third-party services and libraries:

- **GitHub**: Repository data and issue creation
- **LLM Providers**: Anthropic, OpenAI, Google (for draft generation)
- **Resend / Gmail**: Email delivery
- **Supabase/Google Sheets**: Subscriber storage

Review their security policies before use.

## Security Updates

We will release security patches for critical vulnerabilities as soon as possible. Check the [CHANGELOG.md](./CHANGELOG.md) for security-related updates.
