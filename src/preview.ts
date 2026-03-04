import { join } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { loadProducts } from './config.js';
import { gatherActivity } from './gather.js';
import type { GatheredActivity } from './gather.js';

export function parseArgv(argv: string[]): {
  productId: string;
  since?: string;
  repo?: string;
} {
  const args = argv[0] === 'preview' ? argv.slice(1) : argv;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: cryyer preview --product <id> [options]

Options:
  --product <id>    Product ID (required)
  --since <date>    Start date for activity window (default: 7 days ago)
  --repo <o/r>      Override repo from product config
  --help, -h        Show this help message`);
    process.exit(0);
  }

  let productId = '';
  let since: string | undefined;
  let repo: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--product' && args[i + 1]) {
      productId = args[i + 1];
      i++;
    } else if (args[i] === '--since' && args[i + 1]) {
      since = args[i + 1];
      i++;
    } else if (args[i] === '--repo' && args[i + 1]) {
      repo = args[i + 1];
      i++;
    }
  }

  if (!productId) throw new Error('Missing --product <id>. Usage: cryyer preview --product <id>');

  return { productId, since: since || undefined, repo: repo || undefined };
}

export function formatActivity(activity: GatheredActivity): string {
  const lines: string[] = [];

  if (activity.releases.length > 0) {
    lines.push(`Releases (${activity.releases.length}):`);
    for (const r of activity.releases) {
      lines.push(`  ${r.tagName}  ${r.name}`);
      lines.push(`  ${r.url}`);
    }
    lines.push('');
  }

  if (activity.prs.length > 0) {
    lines.push(`Merged PRs (${activity.prs.length}):`);
    for (const pr of activity.prs) {
      lines.push(`  ${pr.title}  (@${pr.author})`);
      lines.push(`  ${pr.url}`);
    }
    lines.push('');
  }

  if (activity.commits.length > 0) {
    lines.push(`Notable Commits (${activity.commits.length}):`);
    for (const c of activity.commits) {
      lines.push(`  ${c.sha}  ${c.message}  (@${c.author})`);
      lines.push(`  ${c.url}`);
    }
    lines.push('');
  }

  if (lines.length === 0) {
    lines.push('No activity found for this period.');
  }

  return lines.join('\n');
}

export async function main(): Promise<void> {
  const { productId, since, repo } = parseArgv(process.argv.slice(2));

  const githubToken = process.env['GITHUB_TOKEN'];
  if (!githubToken) throw new Error('Missing required environment variable: GITHUB_TOKEN');

  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);
  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}. Available: ${products.map((p) => p.id).join(', ')}`);
  }

  if (repo) {
    product.repo = repo;
  }

  const octokit = new Octokit({ auth: githubToken });
  const sinceDate = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  console.log(`Activity for ${product.name} since ${sinceDate}`);
  console.log(`Repo: ${product.repo ?? product.githubRepo}`);
  console.log('');

  const activity = await gatherActivity(octokit, product, sinceDate);
  console.log(formatActivity(activity));

  const total = activity.prs.length + activity.releases.length + activity.commits.length;
  console.log(`Total: ${total} item${total !== 1 ? 's' : ''}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
