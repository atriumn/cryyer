import { readFileSync } from 'fs';
import type { ContentType, Seed } from './types.js';

const VALID_TYPES: ReadonlySet<string> = new Set<ContentType>([
  'pain',
  'insight',
  'capability',
  'proof',
  'update',
  'blog',
]);

/**
 * Parse a markdown seed file into an array of Seed objects.
 *
 * Expected format:
 * ```
 * ## pain
 * first seed paragraph
 *
 * second seed paragraph
 *
 * ## insight
 * another seed
 * ```
 *
 * One seed per paragraph under each `## type` heading.
 */
export function parseSeeds(filePath: string): Seed[] {
  const content = readFileSync(filePath, 'utf-8');
  return parseSeedsFromString(content);
}

export function parseSeedsFromString(content: string): Seed[] {
  const seeds: Seed[] = [];
  const lines = content.split('\n');

  let currentType: ContentType | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = (): void => {
    if (currentType && currentParagraph.length > 0) {
      const text = currentParagraph.join('\n').trim();
      if (text) {
        seeds.push({ type: currentType, text });
      }
    }
    currentParagraph = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const type = headingMatch[1].trim().toLowerCase();
      if (!VALID_TYPES.has(type)) {
        throw new Error(`Unknown content type: "${type}"`);
      }
      currentType = type as ContentType;
      continue;
    }

    if (currentType === null) {
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
    } else {
      currentParagraph.push(line);
    }
  }

  flushParagraph();
  return seeds;
}
