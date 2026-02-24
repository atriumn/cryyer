import { join } from 'path';
import { loadConfig, loadProducts } from './config.js';
import { createGitHubClient, fetchWeeklyChanges } from './github.js';
import { draftWeeklyUpdate } from './llm.js';
import { createEmailClient, sendBatch } from './email.js';
import { createLLMProvider } from './llm-provider.js';
import { createSubscriberStore } from './subscriber-store.js';
import type { EmailJob } from './types.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);

  const octokit = createGitHubClient(config.githubToken);
  const llm = createLLMProvider();
  const resend = createEmailClient(config.resendApiKey);
  const store = createSubscriberStore();

  const weekOf = getWeekOf();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  console.log(`Running cryyer for week of ${weekOf}`);

  const jobs: EmailJob[] = [];

  for (const product of products) {
    console.log(`Processing product: ${product.name}`);

    const repoStr = product.repo || product.githubRepo;
    if (!repoStr) {
      console.error(`  Missing repo configuration for ${product.name}`);
      continue;
    }
    const [owner, repo] = repoStr.split('/');
    const changes = await fetchWeeklyChanges(octokit, owner, repo, since);

    if (changes.length === 0) {
      console.log(`  No changes for ${product.name}, skipping`);
      continue;
    }

    const draft = await draftWeeklyUpdate(llm, product, changes, weekOf);
    const subscribers = await store.getSubscribers(product.id);

    for (const subscriber of subscribers) {
      jobs.push({
        testerId: subscriber.email,
        productId: product.id,
        weekOf,
        subject: product.emailSubjectTemplate.replace('{{weekOf}}', weekOf),
        body: draft,
      });
    }
  }

  console.log(`Sending ${jobs.length} emails...`);
  const { sent, failed } = await sendBatch(resend, jobs, config.fromEmail);
  console.log(`Done: ${sent} sent, ${failed} failed`);

  for (const job of jobs) {
    await store.recordEmailSent(job.testerId, job.productId, job.weekOf);
  }
}

function getWeekOf(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  return monday.toISOString().split('T')[0];
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
