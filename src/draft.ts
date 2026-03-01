import { join } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { loadProducts } from './config.js';
import { gatherWeeklyActivity } from './gather.js';
import { generateEmailDraft } from './summarize.js';
import { createLLMProvider } from './llm-provider.js';

export function isDryRun(): boolean {
  return process.env['DRY_RUN'] === 'true' || process.argv.includes('--dry-run');
}

async function main(): Promise<void> {
  const githubToken = requireEnv('GITHUB_TOKEN');
  const dryRun = isDryRun();

  // Only require CRYYER_REPO when actually creating issues
  let cryyerOwner = '';
  let cryyerRepoName = '';
  if (!dryRun) {
    const cryyerRepo = requireEnv('CRYYER_REPO'); // e.g. "owner/cryyer"
    [cryyerOwner, cryyerRepoName] = cryyerRepo.split('/');
  }

  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);

  const octokit = new Octokit({ auth: githubToken });
  const llm = createLLMProvider();

  const weekOf = getWeekOf();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  if (dryRun) {
    console.log(`[DRY RUN] Generating draft previews for week of ${weekOf}`);
  } else {
    console.log(`Generating draft issues for week of ${weekOf}`);
  }

  for (const product of products) {
    console.log(`Processing product: ${product.name}`);

    try {
      const activity = await gatherWeeklyActivity(octokit, product, since);
      const draft = await generateEmailDraft(llm, product, activity, weekOf);

      const issueTitle = `[${product.name}] Weekly Update — ${weekOf}`;
      const issueBody = `**Subject:** ${draft.subject}\n\n---\n\n${draft.body}`;

      if (dryRun) {
        console.log(`\n[DRY RUN] ${product.name} — draft preview:`);
        console.log(`Title: ${issueTitle}`);
        console.log(`\n${issueBody}`);
        console.log('---');
      } else {
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
      }
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

export { main };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
