import { join } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from 'octokit';
import { loadProducts } from '../config.js';
import { readSocialDraft } from './draft-file.js';

export function parseArgv(argv: string[]): {
  draftPath: string;
  productId: string;
  dryRun: boolean;
  configDir?: string;
} {
  const args = argv[0] === 'blog-publish' ? argv.slice(1) : argv;

  let draftPath: string | undefined;
  let productId: string | undefined;
  let dryRun = false;
  let configDir: string | undefined = process.env['CRYYER_CONFIG_DIR'];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--product' && args[i + 1]) {
      productId = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--config-dir' && args[i + 1]) {
      configDir = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--') && !draftPath) {
      draftPath = args[i];
    }
  }

  if (!draftPath) {
    throw new Error(
      'Missing <path>. Usage: cryyer social blog-publish <draft-path> --product <id> [--dry-run]',
    );
  }
  if (!productId) {
    throw new Error(
      'Missing --product <id>. Usage: cryyer social blog-publish <draft-path> --product <id> [--dry-run]',
    );
  }

  return { draftPath, productId, dryRun, configDir: configDir || undefined };
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'untitled';
}

export function buildFrontmatter(
  template: Record<string, string> | undefined,
  vars: Record<string, string>,
): string {
  if (!template || Object.keys(template).length === 0) {
    return `title: "${vars['title']}"\ndate: "${vars['date']}"`;
  }
  const lines = Object.entries(template).map(([key, value]) => {
    const resolved = value.replace(/\{\{(\w+)\}\}/g, (_, v) => vars[v] ?? '');
    return `${key}: ${resolved}`;
  });
  return lines.join('\n');
}

export async function main(): Promise<void> {
  const { draftPath, productId, dryRun, configDir } = parseArgv(process.argv.slice(2));

  const root = configDir ?? process.cwd();
  const productsDir = join(root, 'products');
  const products = loadProducts(productsDir);
  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error(
      `Product not found: ${productId}. Available: ${products.map((p) => p.id).join(', ')}`,
    );
  }

  if (!product.blog) {
    throw new Error(
      `Product "${productId}" has no blog config. Add a "blog:" section to products/${productId}.yaml`,
    );
  }

  const repo = product.repo ?? product.githubRepo;
  if (!repo) {
    throw new Error(`Product "${productId}" has no "repo" field configured`);
  }

  const draft = readSocialDraft(draftPath);
  const blogPosts = draft.posts.filter((p) => p.seed.type === 'blog');

  if (blogPosts.length === 0) {
    throw new Error(`No blog posts found in ${draftPath}`);
  }

  const githubToken = process.env['GITHUB_TOKEN'];
  if (!githubToken && !dryRun) {
    throw new Error('GITHUB_TOKEN required to commit files to GitHub');
  }

  const [owner, repoName] = repo.split('/');
  const { path: blogPath, format, frontmatter: frontmatterTemplate } = product.blog;
  const date = new Date().toISOString().split('T')[0];

  for (const post of blogPosts) {
    const title = extractTitle(post.text);
    const slug = generateSlug(title);
    const excerpt = post.text.replace(/^#[^\n]*\n+/, '').slice(0, 160).replace(/\n/g, ' ').trim();

    const vars: Record<string, string> = { title, date, excerpt };
    const fm = buildFrontmatter(frontmatterTemplate as Record<string, string> | undefined, vars);
    const fileContent = `---\n${fm}\n---\n\n${post.text}`;
    const filePath = `${blogPath}/${slug}.${format}`;

    if (dryRun) {
      console.log(`\n--- dry run: ${repo}/${filePath} ---`);
      console.log(fileContent);
      continue;
    }

    const octokit = new Octokit({ auth: githubToken });

    // Check if file already exists (needed for update vs create)
    let sha: string | undefined;
    try {
      const existing = await octokit.rest.repos.getContent({ owner, repo: repoName, path: filePath });
      if (!Array.isArray(existing.data) && 'sha' in existing.data) {
        sha = existing.data.sha;
      }
    } catch {
      // File doesn't exist — create it
    }

    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: filePath,
      message: `docs: add blog post "${title}"`,
      content: Buffer.from(fileContent).toString('base64'),
      ...(sha ? { sha } : {}),
    });

    const fileUrl = response.data.content?.html_url ?? `https://github.com/${repo}/blob/main/${filePath}`;
    console.log(fileUrl);
  }

  if (dryRun) {
    console.log('\nDry run complete');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
