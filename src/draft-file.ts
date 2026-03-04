import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { stringify as yamlStringify } from 'yaml';
import { loadProducts } from './config.js';
import { gatherActivity } from './gather.js';
import { generateEmailDraft } from './summarize.js';
import { createLLMProvider } from './llm-provider.js';
import { getWeekOf } from './draft.js';
import { resolveAudiences } from './types.js';

export function formatDraftFile(subject: string, body: string): string {
  const frontMatter = yamlStringify({ subject }).trim();
  return `---\n${frontMatter}\n---\n\n${body}\n`;
}

export function parseArgv(argv: string[]): {
  productId: string;
  output: string;
  since?: string;
  repo?: string;
  audienceId?: string;
} {
  // Skip the 'draft-file' command word if present
  const args = argv[0] === 'draft-file' ? argv.slice(1) : argv;

  let productId = process.env['PRODUCT_ID'] ?? '';
  let output = process.env['DRAFT_OUTPUT'] ?? '';
  let since: string | undefined = process.env['DRAFT_SINCE'];
  let repo: string | undefined = process.env['DRAFT_REPO'];
  let audienceId: string | undefined = process.env['AUDIENCE_ID'];

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
    } else if (args[i] === '--audience' && args[i + 1]) {
      audienceId = args[i + 1];
      i++;
    }
  }

  if (!productId) throw new Error('Missing --product <id>. Usage: cryyer draft-file --product <id> --output <path>');
  if (!output) throw new Error('Missing --output <path>. Usage: cryyer draft-file --product <id> --output <path>');

  return { productId, output, since: since || undefined, repo: repo || undefined, audienceId: audienceId || undefined };
}

export async function main(): Promise<void> {
  const { productId, output, since, repo, audienceId } = parseArgv(process.argv.slice(2));

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

  const audiences = resolveAudiences(product);

  let audience;
  if (audienceId) {
    audience = audiences.find((a) => a.id === audienceId);
    if (!audience) {
      throw new Error(`Audience not found: ${audienceId}. Available: ${audiences.map((a) => a.id ?? '(default)').join(', ')}`);
    }
  } else if (audiences.length > 1) {
    throw new Error(`Product "${productId}" has multiple audiences. Specify one with --audience <id>. Available: ${audiences.map((a) => a.id).join(', ')}`);
  } else {
    audience = audiences[0];
  }

  console.log(`Gathering activity for ${product.name} since ${sinceDate}`);

  const activity = await gatherActivity(octokit, product, sinceDate);
  const draft = await generateEmailDraft(llm, product, activity, weekOf, undefined, audience);

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
