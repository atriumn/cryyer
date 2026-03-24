import { readFileSync } from 'fs';
import type { Seed, ContentType } from './types.js';

const VALID_CONTENT_TYPES = new Set<string>(['pain', 'insight', 'capability', 'proof', 'update']);

export function parseSeeds(filePath: string): Seed[] {
  const content = readFileSync(filePath, 'utf-8');
  return parseSeedsFromString(content);
}

export function parseSeedsFromString(content: string): Seed[] {
  const seeds: Seed[] = [];
  const lines = content.split('\n');

  let currentType: ContentType | null = null;
  let paragraphLines: string[] = [];

  function flushParagraph() {
    const text = paragraphLines.join('\n').trim();
    if (text && currentType) {
      seeds.push({ type: currentType, text });
    }
    paragraphLines = [];
  }

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(\S+)\s*$/);
    if (headingMatch) {
      flushParagraph();
      const typeStr = headingMatch[1].toLowerCase();
      if (!VALID_CONTENT_TYPES.has(typeStr)) {
        throw new Error(`Unknown content type: "${typeStr}"`);
      }
      currentType = typeStr as ContentType;
      continue;
    }

    if (currentType === null) continue;

    if (line.trim() === '') {
      flushParagraph();
    } else {
      paragraphLines.push(line);
    }
  }

  flushParagraph();

  return seeds;
}
