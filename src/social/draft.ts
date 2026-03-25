import { join } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { loadProducts } from '../config.js';
import { gatherActivity } from '../gather.js';
import { createLLMProvider } from '../llm-provider.js';
import { parseSeeds } from './parse-seeds.js';
import { loadPlatforms } from './platforms.js';
import { generateSocialPosts } from './generate.js';
import { writeSocialDraft } from './draft-file.js';
import type { ContentType, SocialDraft } from './types.js';

export function parseArgv(argv: string[]): {
  productId: string;
  type?: ContentType;
  dryRun: boolean;
  configDir?: string;
} {
  const args = argv[0] === 'draft' ? argv.slice(1) : argv;

  let productId: string | undefined;
  let type: ContentType | undefined;
  let dryRun = false;
  let configDir: string | undefined = process.env['CRYYER_CONFIG_DIR'];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--product' && args[i + 1]) {
      productId = args[i + 1];
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      type = args[i + 1] as ContentType;
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--config-dir' && args[i + 1]) {
      configDir = args[i + 1];
      i++;
    }
  }

  if (!productId) {
    throw new Error(
      'Missing --product <id>. Usage: cryyer social draft --product <id> [--type <type>] [--dry-run]',
    );
  }

  return { productId, type, dryRun, configDir: configDir || undefined };
}

export async function main(): Promise<void> {
  const { productId, type, dryRun, configDir } = parseArgv(process.argv.slice(2));

  const root = configDir ?? process.cwd();
  const productsDir = join(root, 'products');
  const products = loadProducts(productsDir);
  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error(
      `Product not found: ${productId}. Available: ${products.map((p) => p.id).join(', ')}`,
    );
  }

  if (!product.social?.platforms?.length) {
    throw new Error(
      `Product "${productId}" has no social.platforms configured`,
    );
  }

  // Load all platforms, then filter to ones listed in product config
  const allPlatforms = loadPlatforms(join(root, 'platforms'));
  const platforms = allPlatforms.filter((p) =>
    product.social!.platforms.includes(p.id),
  );
  if (platforms.length === 0) {
    throw new Error(
      `No matching platform configs found for: ${product.social.platforms.join(', ')}`,
    );
  }

  // Parse seeds
  const seedsFile = join(root, 'seeds', `${productId}.md`);
  let seeds = parseSeeds(seedsFile);

  // Filter by type if provided
  if (type) {
    seeds = seeds.filter((s) => s.type === type);
    if (seeds.length === 0) {
      throw new Error(`No seeds found with type "${type}" in ${seedsFile}`);
    }
  }

  // Gather activity for update-type seeds
  let activity;
  const hasUpdateSeeds = seeds.some((s) => s.type === 'update');
  if (hasUpdateSeeds && product.repo) {
    const githubToken = process.env['GITHUB_TOKEN'];
    if (!githubToken) {
      throw new Error(
        'GITHUB_TOKEN required for update-type seeds (needs to gather repo activity)',
      );
    }
    const octokit = new Octokit({ auth: githubToken });
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Gathering activity for ${product.name} since ${since}`);
    activity = await gatherActivity(octokit, product, since);
  }

  // Generate posts
  const llm = createLLMProvider();
  console.log(`Generating posts for ${seeds.length} seeds across ${platforms.length} platforms...`);
  const posts = await generateSocialPosts(llm, product, seeds, platforms, activity);

  if (dryRun) {
    for (const post of posts) {
      console.log(`\n--- ${post.seed.type} | ${post.platform.id} ---`);
      console.log(post.text);
    }
    console.log('\nDry run complete');
    return;
  }

  // Write draft file
  const draft: SocialDraft = {
    product: productId,
    generatedAt: new Date().toISOString(),
    seeds: seeds.length,
    posts,
  };

  const outputDir = join(root, 'social-drafts');
  const filePath = writeSocialDraft(draft, outputDir);
  console.log(filePath);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
