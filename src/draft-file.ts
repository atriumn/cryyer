import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { stringify as yamlStringify } from 'yaml';
import { loadProducts } from './config.js';
import { gatherWeeklyActivity } from './gather.js';
import { generateEmailDraft } from './summarize.js';
import { createLLMProvider } from './llm-provider.js';
import { getWeekOf } from './draft.js';

export function formatDraftFile(subject: string, body: string): string {
  const frontMatter = yamlStringify({ subject }).trim();
  return `---\n${frontMatter}\n---\n\n${body}\n`;
}

export function parseArgv(argv: string[]): {
  productId: string;
  output: string;
  since?: string;
  repo?: string;
} {
  // Skip the 'draft-file' command word if present
  const args = argv[0] === 'draft-file' ? argv.slice(1) : argv;

  let productId = process.env['PRODUCT_ID'] ?? '';
  let output = process.env['DRAFT_OUTPUT'] ?? '';
  let since: string | undefined = process.env['DRAFT_SINCE'];
  let repo: string | undefined = process.env['DRAFT_REPO'];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--product' && args[i + 1]) {
      productId = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      output = args[i + 1];
      i++;
    } else if (args[i] === '--since' && args[i + 1]) {
      since = args[i + 1];
      i++;
    } else if (args[i] === '--repo' && args[i + 1]) {
      repo = args[i + 1];
      i++;
    }
  }

  if (!productId) throw new Error('Missing --product <id>. Usage: cryyer draft-file --product <id> --output <path>');
  if (!output) throw new Error('Missing --output <path>. Usage: cryyer draft-file --product <id> --output <path>');

  return { productId, output, since: since || undefined, repo: repo || undefined };
}

export async function main(): Promise<void> {
  const { productId, output, since, repo } = parseArgv(process.argv.slice(2));

  const githubToken = requireEnv('GITHUB_TOKEN');

  const productsDir = join(process.cwd(), 'products');
  const products = loadProducts(productsDir);
  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}. Available: ${products.map((p) => p.id).join(', ')}`);
  }

  // Allow --repo to override the product config repo
  if (repo) {
    product.repo = repo;
  }

  const octokit = new Octokit({ auth: githubToken });
  const llm = createLLMProvider();

  const weekOf = getWeekOf();
  const sinceDate = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  console.log(`Gathering activity for ${product.name} since ${sinceDate}`);

  const activity = await gatherWeeklyActivity(octokit, product, sinceDate);
  const draft = await generateEmailDraft(llm, product, activity, weekOf);

  const fileContent = formatDraftFile(draft.subject, draft.body);

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, fileContent, 'utf-8');

  console.log(`Draft written to ${output}`);
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
