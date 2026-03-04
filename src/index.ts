import { join } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { loadProducts } from './config.js';
import { gatherActivity } from './gather.js';
import { generateEmailDraft } from './summarize.js';
import { sendEmails } from './send.js';
import { createLLMProvider } from './llm-provider.js';
import { createSubscriberStore } from './subscriber-store.js';
import { createEmailProvider } from './email-provider.js';
import { resolveAudiences, subscriberKey } from './types.js';

export function isDryRun(): boolean {
  return process.env['DRY_RUN'] === 'true' || process.argv.includes('--dry-run');
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

async function main(): Promise<void> {
  const dryRun = isDryRun();

  const githubToken = requireEnv('GITHUB_TOKEN');
  const fromEmail = dryRun ? (process.env['FROM_EMAIL'] ?? '') : requireEnv('FROM_EMAIL');

  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);

  const octokit = new Octokit({ auth: githubToken });
  const llm = createLLMProvider();
  const emailProvider = dryRun ? null : createEmailProvider();
  const store = createSubscriberStore();

  const weekOf = getWeekOf();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  if (dryRun) {
    console.log(`[DRY RUN] Running cryyer preview for week of ${weekOf}`);
  } else {
    console.log(`Running cryyer for week of ${weekOf}`);
  }

  for (const product of products) {
    console.log(`Processing product: ${product.name}`);

    try {
      const activity = await gatherActivity(octokit, product, since);
      const audiences = resolveAudiences(product);

      for (const audience of audiences) {
        const draft = await generateEmailDraft(llm, product, activity, weekOf, undefined, audience);
        const subKey = subscriberKey(product.id, audience.id);
        const subscribers = await store.getSubscribers(subKey);
        const audienceSuffix = audience.id ? ` [${audience.id}]` : '';

        if (dryRun) {
          console.log(`\n[DRY RUN] ${product.name}${audienceSuffix}:`);
          console.log(`  Subscribers: ${subscribers.length}`);
          console.log(`  Subject: ${draft.subject}`);
          console.log(`\n${draft.body}`);
          console.log('---');
          continue;
        }

        if (subscribers.length === 0) {
          console.log(`  No subscribers for ${product.name}${audienceSuffix}, skipping`);
          continue;
        }

        const audienceFromName = audience.from_name ?? process.env['FROM_NAME'] ?? 'Cryyer Updates';
        const audienceFromEmail = audience.from_email ?? fromEmail;
        const replyTo = audience.reply_to;

        const stats = await sendEmails(
          emailProvider!,
          product,
          subscribers,
          { subject: draft.subject, body: draft.body },
          audienceFromName,
          audienceFromEmail,
          replyTo
        );

        console.log(`  ${product.name}${audienceSuffix}: ${stats.sent} sent, ${stats.failed} failed`);

        for (const subscriber of subscribers) {
          await store.recordEmailSent(subscriber.email, subKey, weekOf);
        }
      }
    } catch (err) {
      console.error(`  Error processing ${product.name}:`, err);
      process.exitCode = 1;
    }
  }
}

export function getWeekOf(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToSubtract = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysToSubtract);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export { main };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
