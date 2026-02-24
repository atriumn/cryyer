import { join } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { loadProducts } from './config.js';
import { gatherWeeklyActivity } from './gather.js';
import { generateEmailDraft } from './summarize.js';
import { createLLMProvider } from './llm-provider.js';

async function main(): Promise<void> {
  const githubToken = requireEnv('GITHUB_TOKEN');
  const cryyerRepo = requireEnv('CRYYER_REPO'); // e.g. "owner/cryyer"

  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);

  const octokit = new Octokit({ auth: githubToken });
  const llm = createLLMProvider();

  const [cryyerOwner, cryyerRepoName] = cryyerRepo.split('/');

  const weekOf = getWeekOf();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  console.log(`Generating draft issues for week of ${weekOf}`);

  for (const product of products) {
    console.log(`Processing product: ${product.name}`);

    try {
      const activity = await gatherWeeklyActivity(octokit, product, since);
      const draft = await generateEmailDraft(llm, product, activity, weekOf);

      const issueTitle = `[${product.name}] Weekly Update — ${weekOf}`;
      const issueBody = `**Subject:** ${draft.subject}\n\n---\n\n${draft.body}`;

      await ensureLabel(octokit, cryyerOwner, cryyerRepoName, 'draft', '0075ca');
      await ensureLabel(octokit, cryyerOwner, cryyerRepoName, product.id, 'e4e669');

      const { data: issue } = await octokit.rest.issues.create({
        owner: cryyerOwner,
        repo: cryyerRepoName,
        title: issueTitle,
        body: issueBody,
        labels: ['draft', product.id],
      });

      console.log(`  Created issue: ${issue.html_url}`);
    } catch (err) {
      console.error(`  Error processing ${product.name}:`, err);
      process.exitCode = 1;
    }
  }
}

export async function ensureLabel(
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
      // Label may already exist due to a race condition; safe to ignore
    }
  }
}

export function getWeekOf(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  return monday.toISOString().split('T')[0];
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
