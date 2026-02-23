import { Resend } from 'resend';
import type { EmailJob } from './types.js';

export function createEmailClient(apiKey: string): Resend {
  return new Resend(apiKey);
}

export async function sendEmail(
  client: Resend,
  job: EmailJob,
  from: string
): Promise<void> {
  const { error } = await client.emails.send({
    from,
    to: job.testerId,
    subject: job.subject,
    text: job.body,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendBatch(
  client: Resend,
  jobs: EmailJob[],
  from: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await sendEmail(client, job, from);
      sent++;
    } catch (err) {
      console.error(`Failed to send to ${job.testerId}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}
