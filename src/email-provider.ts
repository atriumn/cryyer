import { Resend } from 'resend';

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

// --- Factory ---

export type EmailProviderType = 'resend';

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
    default:
      throw new Error(`Unknown email provider: ${providerName}. Supported: resend`);
  }
}
