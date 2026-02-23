import { join } from 'path';
import { loadConfig, loadProducts } from './config.js';
import { createGitHubClient, fetchWeeklyChanges } from './github.js';
import { createAnthropicClient, draftWeeklyUpdate } from './llm.js';
import { createEmailClient, sendBatch } from './email.js';
import { createDbClient, getBetaTesters, recordEmailSent } from './db.js';
import type { EmailJob } from './types.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);

  const octokit = createGitHubClient(config.githubToken);
  const anthropic = createAnthropicClient(config.anthropicApiKey);
  const resend = createEmailClient(config.resendApiKey);
  const db = createDbClient(config.supabaseUrl, config.supabaseKey);

  const weekOf = getWeekOf();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  console.log(`Running beacon for week of ${weekOf}`);

  const jobs: EmailJob[] = [];

  for (const product of products) {
    console.log(`Processing product: ${product.name}`);

    const [owner, repo] = product.githubRepo.split('/');
    const changes = await fetchWeeklyChanges(octokit, owner, repo, since);

    if (changes.length === 0) {
      console.log(`  No changes for ${product.name}, skipping`);
      continue;
    }

    const draft = await draftWeeklyUpdate(anthropic, product, changes, weekOf);
    const testers = await getBetaTesters(db, product.id);

    for (const tester of testers) {
      jobs.push({
        testerId: tester.email,
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
    await recordEmailSent(db, job.testerId, job.productId, job.weekOf);
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
