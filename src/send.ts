import { readFileSync } from 'fs';
import { join } from 'path';
import { Resend } from 'resend';
import type { BetaTester, Product } from './types.js';

export interface EmailContent {
  subject: string;
  body: string; // markdown
}

export interface DeliveryStats {
  sent: number;
  failed: number;
  failures: Array<{ email: string; error: string }>;
}

const RESEND_BATCH_LIMIT = 100;

export function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold (before italic)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive list items in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>\n$1</ul>\n');

  // Wrap non-block content in <p> tags, splitting on blank lines
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|ul|ol|p|div|blockquote)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  return html;
}

function buildEmailHtml(
  bodyHtml: string,
  subject: string,
  productName: string,
  unsubscribeUrl: string
): string {
  const templatePath = join(process.cwd(), 'templates', 'email-wrapper.html');
  const template = readFileSync(templatePath, 'utf-8');
  return template
    .replace('{{subject}}', subject)
    .replace('{{productName}}', productName)
    .replace('{{body}}', bodyHtml)
    .replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl)
    .replace(/\{\{productName\}\}/g, productName);
}

function makeUnsubscribeUrl(fromEmail: string, productId: string): string {
  const subject = encodeURIComponent(`unsubscribe ${productId}`);
  return `mailto:${fromEmail}?subject=${subject}`;
}

export async function sendWeeklyEmails(
  client: Resend,
  product: Product,
  subscribers: BetaTester[],
  content: EmailContent,
  fromName: string,
  fromEmail: string,
  replyTo?: string
): Promise<DeliveryStats> {
  const stats: DeliveryStats = { sent: 0, failed: 0, failures: [] };

  if (subscribers.length === 0) return stats;

  const bodyHtml = markdownToHtml(content.body);
  const unsubscribeUrl = makeUnsubscribeUrl(fromEmail, product.id);
  const html = buildEmailHtml(bodyHtml, content.subject, product.name, unsubscribeUrl);
  const from = `${fromName} <${fromEmail}>`;

  const emails = subscribers.map((subscriber) => ({
    from,
    to: subscriber.email,
    subject: content.subject,
    html,
    ...(replyTo ? { replyTo } : {}),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }));

  for (let i = 0; i < emails.length; i += RESEND_BATCH_LIMIT) {
    const chunk = emails.slice(i, i + RESEND_BATCH_LIMIT);
    try {
      const { error } = await client.batch.send(chunk);
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
