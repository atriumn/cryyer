import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { Product } from './types.js';
import type { Subscriber } from './subscriber-store.js';
import type { EmailProvider, BatchResult } from './email-provider.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface EmailContent {
  subject: string;
  body: string; // markdown
}

export type DeliveryStats = BatchResult;

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
  const templatePath = join(__dirname, '..', 'templates', 'email-wrapper.html');
  const template = readFileSync(templatePath, 'utf-8');
  return template
    .replace('{{subject}}', subject)
    .replace(/\{\{product_name\}\}/g, productName)
    .replace('{{body_html}}', bodyHtml)
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
}

function makeUnsubscribeUrl(fromEmail: string, productId: string): string {
  const subject = encodeURIComponent(`unsubscribe ${productId}`);
  return `mailto:${fromEmail}?subject=${subject}`;
}

export async function sendEmails(
  provider: EmailProvider,
  product: Product,
  subscribers: Subscriber[],
  content: EmailContent,
  fromName: string,
  fromEmail: string,
  replyTo?: string
): Promise<DeliveryStats> {
  if (subscribers.length === 0) {
    return { sent: 0, failed: 0, failures: [] };
  }

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

  return provider.sendBatch(emails);
}
