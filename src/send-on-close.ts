import { join } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { Resend } from 'resend';
import { loadProducts } from './config.js';
import { createSubscriberStore } from './subscriber-store.js';
import { sendWeeklyEmails } from './send.js';
import type { BetaTester } from './types.js';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function parseIssueBody(body: string): { subject: string; emailBody: string } | null {
  // Body format: **Subject:** ${subject}\n\n---\n\n${body}
  const subjectMatch = body.match(/^\*\*Subject:\*\*\s*(.+)$/m);
  if (!subjectMatch) return null;

  const subject = subjectMatch[1].trim();

  const separatorIndex = body.indexOf('\n\n---\n\n');
  if (separatorIndex === -1) return null;

  const emailBody = body.slice(separatorIndex + '\n\n---\n\n'.length).trim();

  return { subject, emailBody };
}

async function ensureLabel(
  octokit: Octokit,
  owner: string,
  repo: string,
  name: string,
  color: string
): Promise<void> {
  try {
    await octokit.rest.issues.getLabel({ owner, repo, name });
  } catch {
    try {
      await octokit.rest.issues.createLabel({ owner, repo, name, color });
    } catch {
      // Label may already exist due to race condition; safe to ignore
    }
  }
}

async function main(): Promise<void> {
  const githubToken = requireEnv('GITHUB_TOKEN');
  const resendApiKey = requireEnv('RESEND_API_KEY');
  const fromEmail = requireEnv('FROM_EMAIL');
  const fromName = process.env['FROM_NAME'] ?? 'Cryyer Updates';
  const issueNumber = parseInt(requireEnv('ISSUE_NUMBER'), 10);
  const [repoOwner, repoName] = requireEnv('GITHUB_REPOSITORY').split('/');

  const octokit = new Octokit({ auth: githubToken });
  const resend = new Resend(resendApiKey);
  const store = createSubscriberStore();

  // Fetch issue
  const { data: issue } = await octokit.rest.issues.get({
    owner: repoOwner,
    repo: repoName,
    issue_number: issueNumber,
  });

  const labelNames = issue.labels.map((l) => (typeof l === 'string' ? l : (l.name ?? '')));

  // Check for draft label — skip if not present
  if (!labelNames.includes('draft')) {
    console.log('Issue does not have "draft" label, skipping.');
    return;
  }

  // Load products and find the matching product label
  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);
  const productIds = new Set(products.map((p) => p.id));

  const productId = labelNames.find((l) => productIds.has(l));
  if (!productId) {
    console.warn('No matching product label found on issue, skipping.');
    return;
  }

  const product = products.find((p) => p.id === productId);
  if (!product) {
    console.warn(`Product config not found for: ${productId}, skipping.`);
    return;
  }

  // Parse email content from issue body
  const parsed = parseIssueBody(issue.body ?? '');
  if (!parsed) {
    await octokit.rest.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      body: '❌ Could not parse email subject/body from issue. Expected format: `**Subject:** ...\\n\\n---\\n\\n<body>`',
    });
    return;
  }

  const emailContent = { subject: parsed.subject, body: parsed.emailBody };

  // Fetch subscribers
  const subscribers = await store.getSubscribers(productId);

  if (subscribers.length === 0) {
    console.warn(`No active subscribers found for product: ${productId}`);
    await octokit.rest.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      body: `⚠️ No active subscribers found for **${product.name}**. No emails sent.`,
    });
    await ensureLabel(octokit, repoOwner, repoName, 'sent', '0e8a16');
    await octokit.rest.issues.addLabels({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      labels: ['sent'],
    });
    return;
  }

  // Adapt Subscriber[] to BetaTester[] for sendWeeklyEmails
  const betaTesters: BetaTester[] = subscribers.map((s, i) => ({
    id: String(i),
    email: s.email,
    name: s.name ?? '',
    productIds: [productId],
  }));

  // Send emails
  let stats;
  try {
    stats = await sendWeeklyEmails(resend, product, betaTesters, emailContent, fromName, fromEmail);
  } catch (err) {
    // Re-open issue and add error comment on unexpected send failure
    await octokit.rest.issues.update({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      state: 'open',
    });
    await octokit.rest.issues.createComment({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      body: `❌ Failed to send emails: ${String(err)}\n\nIssue reopened for retry.`,
    });
    process.exitCode = 1;
    return;
  }

  // Add sent label
  await ensureLabel(octokit, repoOwner, repoName, 'sent', '0e8a16');
  await octokit.rest.issues.addLabels({
    owner: repoOwner,
    repo: repoName,
    issue_number: issueNumber,
    labels: ['sent'],
  });

  // Post delivery stats comment
  const failureDetails =
    stats.failures.length > 0
      ? '\n\n**Failures:**\n' + stats.failures.map((f) => `- ${f.email}: ${f.error}`).join('\n')
      : '';

  await octokit.rest.issues.createComment({
    owner: repoOwner,
    repo: repoName,
    issue_number: issueNumber,
    body: `✅ Email delivery complete for **${product.name}**.\n\n- **Sent:** ${stats.sent}\n- **Failed:** ${stats.failed}${failureDetails}`,
  });

  // Re-open issue if there were any delivery failures
  if (stats.failed > 0) {
    await octokit.rest.issues.update({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      state: 'open',
    });
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
