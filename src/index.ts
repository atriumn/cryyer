import { join } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { Resend } from 'resend';
import { loadConfig, loadProducts } from './config.js';
import { gatherWeeklyActivity } from './gather.js';
import { generateEmailDraft } from './summarize.js';
import { sendWeeklyEmails } from './send.js';
import { createLLMProvider } from './llm-provider.js';
import { createSubscriberStore } from './subscriber-store.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);

  const octokit = new Octokit({ auth: config.githubToken });
  const llm = createLLMProvider();
  const resend = new Resend(config.resendApiKey);
  const store = createSubscriberStore();

  const weekOf = getWeekOf();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  console.log(`Running cryyer for week of ${weekOf}`);

  for (const product of products) {
    console.log(`Processing product: ${product.name}`);

    try {
      const activity = await gatherWeeklyActivity(octokit, product, since);
      const draft = await generateEmailDraft(llm, product, activity, weekOf);
      const subscribers = await store.getSubscribers(product.id);

      if (subscribers.length === 0) {
        console.log(`  No subscribers for ${product.name}, skipping`);
        continue;
      }

      const fromName = product.from_name ?? process.env['FROM_NAME'] ?? 'Cryyer Updates';
      const fromEmail = product.from_email ?? config.fromEmail;
      const replyTo = product.reply_to;

      const stats = await sendWeeklyEmails(
        resend,
        product,
        subscribers,
        { subject: draft.subject, body: draft.body },
        fromName,
        fromEmail,
        replyTo
      );

      console.log(`  ${product.name}: ${stats.sent} sent, ${stats.failed} failed`);

      for (const subscriber of subscribers) {
        await store.recordEmailSent(subscriber.email, product.id, weekOf);
      }
    } catch (err) {
      console.error(`  Error processing ${product.name}:`, err);
      process.exitCode = 1;
    }
  }
}

export function getWeekOf(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  return monday.toISOString().split('T')[0];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
