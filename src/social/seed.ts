import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import type { ContentType } from './types.js';

const VALID_TYPES: ReadonlySet<string> = new Set<ContentType>([
  'pain',
  'insight',
  'capability',
  'proof',
  'update',
  'blog',
]);

export function parseArgv(argv: string[]): {
  productId: string;
  type: ContentType;
  text: string;
} {
  // argv may come from cli.ts with 'seed' stripped, or from process.argv.slice(2) with 'social seed' stripped
  const args = argv[0] === 'seed' ? argv.slice(1) : argv;

  if (args.length < 3) {
    throw new Error('Usage: cryyer social seed <productId> <type> "<text>"');
  }

  const productId = args[0];
  const type = args[1];
  const text = args.slice(2).join(' ');

  if (!VALID_TYPES.has(type)) {
    throw new Error(
      `Unknown content type: "${type}". Valid types: ${[...VALID_TYPES].join(', ')}`,
    );
  }

  return { productId, type: type as ContentType, text };
}

/**
 * Append a seed to the markdown seed file for a product.
 * Creates the file and parent directories if they don't exist.
 * Appends under the matching `## type` heading, or creates it.
 */
export function appendSeed(
  seedsDir: string,
  productId: string,
  type: ContentType,
  text: string,
): string {
  mkdirSync(seedsDir, { recursive: true });
  const filePath = join(seedsDir, `${productId}.md`);

  if (!existsSync(filePath)) {
    const content = `## ${type}\n${text}\n`;
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  const existing = readFileSync(filePath, 'utf-8');
  const headingPattern = new RegExp(`^## ${type}$`, 'm');
  const match = headingPattern.exec(existing);

  if (match) {
    // Find the end of this section (next heading or EOF)
    const afterHeading = existing.slice(match.index + match[0].length);
    const nextHeading = afterHeading.search(/^## /m);
    const insertPos =
      nextHeading === -1
        ? existing.length
        : match.index + match[0].length + nextHeading;

    // Ensure there's a blank line before the new paragraph
    const before = existing.slice(0, insertPos).replace(/\n*$/, '');
    const after = existing.slice(insertPos);

    const content = `${before}\n\n${text}\n${after}`;
    writeFileSync(filePath, content, 'utf-8');
  } else {
    // Add new heading section at the end
    const normalized = existing.replace(/\n*$/, '');
    const content = `${normalized}\n\n## ${type}\n${text}\n`;
    writeFileSync(filePath, content, 'utf-8');
  }

  return filePath;
}

export async function main(): Promise<void> {
  const { productId, type, text } = parseArgv(process.argv.slice(2));

  const seedsDir = join(process.cwd(), 'seeds');
  const filePath = appendSeed(seedsDir, productId, type, text);

  console.log(`Added ${type} seed to ${filePath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
