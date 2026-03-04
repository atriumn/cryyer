import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { parse as yamlParse } from 'yaml';
import { loadProducts } from './config.js';
import { createSubscriberStore } from './subscriber-store.js';
import { sendEmails } from './send.js';
import type { EmailContent } from './send.js';
import { createEmailProvider } from './email-provider.js';
import { subscriberKey } from './types.js';

export function parseDraftFile(content: string): EmailContent {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Invalid draft file: expected YAML front matter (---\\n...\\n---\\n...)');
  }

  const frontMatter = yamlParse(match[1]) as Record<string, unknown>;
  const body = match[2].trim();

  if (typeof frontMatter.subject !== 'string' || !frontMatter.subject) {
    throw new Error('Invalid draft file: missing "subject" in front matter');
  }

  return { subject: frontMatter.subject, body };
}

export function parseArgv(argv: string[]): { filePath: string; productId: string; dryRun: boolean; audienceId?: string } {
  // Skip the 'send-file' command word if present
  const args = argv[0] === 'send-file' ? argv.slice(1) : argv;

  let filePath = process.env['DRAFT_FILE'] ?? '';
  let productId = process.env['PRODUCT_ID'] ?? '';
  let dryRun = process.env['DRY_RUN'] === 'true';
  let audienceId: string | undefined = process.env['AUDIENCE_ID'];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--product' && args[i + 1]) {
      productId = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--audience' && args[i + 1]) {
      audienceId = args[i + 1];
      i++;
    } else if (!args[i].startsWith('-')) {
      filePath = args[i];
    }
  }

  if (!filePath) throw new Error('Missing draft file path. Usage: cryyer send-file <path> --product <id>');
  if (!productId) throw new Error('Missing --product <id>. Usage: cryyer send-file <path> --product <id>');

  return { filePath, productId, dryRun, audienceId: audienceId || undefined };
}

export async function main(): Promise<void> {
  const { filePath, productId, dryRun, audienceId } = parseArgv(process.argv.slice(2));

  const content = readFileSync(filePath, 'utf-8');
  const emailContent = parseDraftFile(content);

  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);
  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}. Available: ${products.map((p) => p.id).join(', ')}`);
  }

  const fromEmail = dryRun ? (process.env['FROM_EMAIL'] ?? '') : requireEnv('FROM_EMAIL');
  const fromName = process.env['FROM_NAME'] ?? 'Cryyer Updates';

  const store = createSubscriberStore();
  const subKey = subscriberKey(productId, audienceId);
  const subscribers = await store.getSubscribers(subKey);

  if (subscribers.length === 0) {
    console.warn(`No active subscribers found for product: ${productId}`);
    return;
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] ${product.name} — would send email:`);
    console.log(`  Subscribers: ${subscribers.length}`);
    console.log(`  Subject: ${emailContent.subject}`);
    console.log(`\n${emailContent.body}`);
    console.log('---');
    return;
  }

  const emailProvider = createEmailProvider();
  const replyTo = product.reply_to;
  const stats = await sendEmails(emailProvider, product, subscribers, emailContent, fromName, fromEmail, replyTo);

  console.log(`Email delivery complete for ${product.name}.`);
  console.log(`  Sent: ${stats.sent}`);
  console.log(`  Failed: ${stats.failed}`);

  if (stats.failed > 0) {
    for (const f of stats.failures) {
      console.error(`  ${f.email}: ${f.error}`);
    }
    process.exitCode = 1;
  }
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
