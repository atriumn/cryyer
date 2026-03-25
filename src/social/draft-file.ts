import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { stringify as yamlStringify, parse as yamlParse } from 'yaml';
import type { SocialDraft, SocialPost, Seed, Platform } from './types.js';

/**
 * Write a SocialDraft to a markdown file with YAML frontmatter.
 * Returns the absolute path of the written file.
 */
export function writeSocialDraft(draft: SocialDraft, outputDir: string): string {
  mkdirSync(outputDir, { recursive: true });

  const date = draft.generatedAt.split('T')[0];
  const fileName = `${draft.product}-${date}.md`;
  const filePath = join(outputDir, fileName);

  const frontmatter = yamlStringify({
    product: draft.product,
    generatedAt: draft.generatedAt,
    seeds: draft.seeds,
    posts: draft.posts.length,
  }).trim();

  // Group posts by seed text + type
  const grouped = groupBySeed(draft.posts);
  const bodyParts: string[] = [];

  for (const group of grouped) {
    const { seed, posts } = group;
    const heading = `### ${seed.type} — "${truncate(seed.text, 40)}"`;
    const platformSections = posts.map(
      (p) => `**${p.platform.id}:**\n${p.text}`,
    );
    bodyParts.push([heading, '', ...platformSections].join('\n'));
  }

  const content = `---\n${frontmatter}\n---\n\n${bodyParts.join('\n\n---\n\n')}\n`;
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Parse a social draft markdown file back into a SocialDraft.
 */
export function readSocialDraft(filePath: string): SocialDraft {
  const raw = readFileSync(filePath, 'utf-8');

  // Split frontmatter from body
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error(`Invalid social draft file: missing YAML frontmatter in ${filePath}`);
  }

  const meta = yamlParse(fmMatch[1]) as {
    product: string;
    generatedAt: string;
    seeds: number;
    posts: number;
  };

  const body = fmMatch[2].trimEnd();
  const sections = body.split(/\n\n---\n\n/);

  const posts: SocialPost[] = [];

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split('\n');
    const headingMatch = lines[0].match(/^###\s+(\w+)\s+—\s+"(.+)"$/);
    if (!headingMatch) {
      throw new Error(`Invalid section heading: ${lines[0]}`);
    }

    const seedType = headingMatch[1] as Seed['type'];
    const seedText = headingMatch[2];
    const seed: Seed = { type: seedType, text: seedText };

    // Parse platform blocks: **platformId:**\n<text>
    const platformBlocks = section.slice(lines[0].length + 1); // skip heading + newline
    const platformRegex = /\*\*(\w+):\*\*\n([\s\S]*?)(?=\n\*\*\w+:\*\*|$)/g;
    let match: RegExpExecArray | null;
    while ((match = platformRegex.exec(platformBlocks)) !== null) {
      const platformId = match[1];
      const text = match[2].trimEnd();
      // Reconstruct a minimal Platform object from what we have in the file
      const platform: Platform = {
        id: platformId,
        name: platformId,
        maxLength: 0,
        voice: '',
      };
      posts.push({ seed, platform, text });
    }
  }

  return {
    product: meta.product,
    generatedAt: meta.generatedAt,
    seeds: meta.seeds,
    posts,
  };
}

interface SeedGroup {
  seed: Seed;
  posts: SocialPost[];
}

function groupBySeed(posts: SocialPost[]): SeedGroup[] {
  const groups: SeedGroup[] = [];
  const seen = new Map<string, number>();

  for (const post of posts) {
    const key = `${post.seed.type}:${post.seed.text}`;
    const idx = seen.get(key);
    if (idx !== undefined) {
      groups[idx].posts.push(post);
    } else {
      seen.set(key, groups.length);
      groups.push({ seed: post.seed, posts: [post] });
    }
  }

  return groups;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}
