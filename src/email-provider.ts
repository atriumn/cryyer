import { Resend } from 'resend';
import { OAuth2Client } from 'google-auth-library';
import { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } from './gmail-oauth.js';

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface BatchResult {
  sent: number;
  failed: number;
  failures: Array<{ email: string; error: string }>;
}

export interface EmailProvider {
  sendBatch(emails: EmailMessage[]): Promise<BatchResult>;
}

// --- ResendProvider ---

const RESEND_BATCH_LIMIT = 100;

export class ResendProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendBatch(emails: EmailMessage[]): Promise<BatchResult> {
    const client = new Resend(this.apiKey);

    const stats: BatchResult = { sent: 0, failed: 0, failures: [] };

    for (let i = 0; i < emails.length; i += RESEND_BATCH_LIMIT) {
      const chunk = emails.slice(i, i + RESEND_BATCH_LIMIT);
      const resendEmails = chunk.map((e) => ({
        from: e.from,
        to: e.to,
        subject: e.subject,
        html: e.html,
        ...(e.replyTo ? { replyTo: e.replyTo } : {}),
        headers: e.headers,
      }));

      try {
        const { error } = await client.batch.send(resendEmails);
        if (error) {
          for (const email of chunk) {
            stats.failed++;
            stats.failures.push({ email: email.to, error: error.message });
          }
        } else {
          stats.sent += chunk.length;
        }
      } catch (err) {
        for (const email of chunk) {
          stats.failed++;
          stats.failures.push({ email: email.to, error: String(err) });
        }
      }
    }

    return stats;
  }
}

// --- GmailProvider ---

function buildRfc2822Message(email: EmailMessage): string {
  const lines: string[] = [
    `From: ${email.from}`,
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
  ];

  if (email.replyTo) {
    lines.push(`Reply-To: ${email.replyTo}`);
  }

  if (email.headers) {
    for (const [key, value] of Object.entries(email.headers)) {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('', email.html);
  return lines.join('\r\n');
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export class GmailProvider implements EmailProvider {
  private refreshToken: string;

  constructor(refreshToken: string) {
    this.refreshToken = refreshToken;
  }

  private async getAccessToken(): Promise<string> {
    const oauth2Client = new OAuth2Client(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: this.refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error('Failed to obtain Gmail access token from refresh token');
    return token;
  }

  async sendBatch(emails: EmailMessage[]): Promise<BatchResult> {
    const stats: BatchResult = { sent: 0, failed: 0, failures: [] };
    const accessToken = await this.getAccessToken();

    for (const email of emails) {
      try {
        const raw = base64UrlEncode(buildRfc2822Message(email));
        const response = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw }),
          }
        );

        if (!response.ok) {
          const body = await response.text();
          stats.failed++;
          stats.failures.push({ email: email.to, error: `Gmail API ${response.status}: ${body}` });
        } else {
          stats.sent++;
        }
      } catch (err) {
        stats.failed++;
        stats.failures.push({ email: email.to, error: String(err) });
      }
    }

    return stats;
  }
}

// --- Factory ---

export type EmailProviderType = 'resend' | 'gmail';

export function createEmailProvider(overrides?: {
  provider?: EmailProviderType;
}): EmailProvider {
  const providerName = (overrides?.provider || process.env.EMAIL_PROVIDER || 'resend') as EmailProviderType;

  switch (providerName) {
    case 'resend': {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new Error('Missing RESEND_API_KEY environment variable');
      return new ResendProvider(apiKey);
    }
    case 'gmail': {
      const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
      if (!refreshToken) throw new Error('Missing GMAIL_REFRESH_TOKEN environment variable. Run "cryyer auth gmail" to authenticate.');
      return new GmailProvider(refreshToken);
    }
    default:
      throw new Error(`Unknown email provider: ${providerName}. Supported: resend, gmail`);
  }
}
