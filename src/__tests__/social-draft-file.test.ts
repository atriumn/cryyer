import { describe, it, expect, afterEach } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { writeSocialDraft, readSocialDraft } from '../social/draft-file.js';
import type { SocialDraft, SocialPost, Platform, Seed } from '../social/types.js';

const TMP_DIR = join(process.cwd(), '.tmp-test-social-drafts');

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

const twitter: Platform = {
  id: 'twitter',
  name: 'Twitter',
  maxLength: 280,
  voice: 'Sharp, concise',
};

const linkedin: Platform = {
  id: 'linkedin',
  name: 'LinkedIn',
  maxLength: 3000,
  voice: 'Professional',
};

function makeDraft(overrides?: Partial<SocialDraft>): SocialDraft {
  const painSeed: Seed = { type: 'pain', text: 'architectural drift' };
  const insightSeed: Seed = { type: 'insight', text: 'provider rotation' };

  const posts: SocialPost[] = [
    { seed: painSeed, platform: twitter, text: 'Linters catch syntax errors. They don\'t catch...' },
    { seed: painSeed, platform: linkedin, text: 'Every codebase I\'ve worked on has the same problem...' },
    { seed: insightSeed, platform: twitter, text: 'We rotate between models because...' },
    { seed: insightSeed, platform: linkedin, text: 'After a year of rotating LLM providers...' },
  ];

  return {
    product: 'noxaudit',
    generatedAt: '2026-03-24T10:00:00Z',
    seeds: 2,
    posts,
    ...overrides,
  };
}

describe('writeSocialDraft', () => {
  it('writes a file and returns the path', () => {
    const draft = makeDraft();
    const path = writeSocialDraft(draft, TMP_DIR);
    expect(path).toBe(join(TMP_DIR, 'noxaudit-2026-03-24.md'));
  });

  it('creates the output directory if needed', () => {
    const draft = makeDraft();
    const nestedDir = join(TMP_DIR, 'nested', 'dir');
    const path = writeSocialDraft(draft, nestedDir);
    expect(path).toContain('nested/dir/noxaudit-2026-03-24.md');
  });
});

describe('readSocialDraft', () => {
  it('parses frontmatter metadata', () => {
    const draft = makeDraft();
    const path = writeSocialDraft(draft, TMP_DIR);
    const result = readSocialDraft(path);

    expect(result.product).toBe('noxaudit');
    expect(result.generatedAt).toBe('2026-03-24T10:00:00Z');
    expect(result.seeds).toBe(2);
  });

  it('parses all posts', () => {
    const draft = makeDraft();
    const path = writeSocialDraft(draft, TMP_DIR);
    const result = readSocialDraft(path);

    expect(result.posts).toHaveLength(4);
  });

  it('preserves seed type and platform id', () => {
    const draft = makeDraft();
    const path = writeSocialDraft(draft, TMP_DIR);
    const result = readSocialDraft(path);

    const painTwitter = result.posts.find(
      (p) => p.seed.type === 'pain' && p.platform.id === 'twitter',
    );
    expect(painTwitter).toBeDefined();
    expect(painTwitter!.text).toContain('Linters catch syntax errors');

    const insightLinkedin = result.posts.find(
      (p) => p.seed.type === 'insight' && p.platform.id === 'linkedin',
    );
    expect(insightLinkedin).toBeDefined();
    expect(insightLinkedin!.text).toContain('rotating LLM providers');
  });
});

describe('round-trip', () => {
  it('write then read produces equivalent data', () => {
    const draft = makeDraft();
    const path = writeSocialDraft(draft, TMP_DIR);
    const result = readSocialDraft(path);

    expect(result.product).toBe(draft.product);
    expect(result.generatedAt).toBe(draft.generatedAt);
    expect(result.seeds).toBe(draft.seeds);
    expect(result.posts).toHaveLength(draft.posts.length);

    // Check post text matches for each seed/platform combo
    for (const original of draft.posts) {
      const found = result.posts.find(
        (p) => p.seed.type === original.seed.type && p.platform.id === original.platform.id,
      );
      expect(found).toBeDefined();
      expect(found!.text).toBe(original.text);
    }
  });

  it('round-trips with a single seed and single platform', () => {
    const seed: Seed = { type: 'capability', text: 'real-time diff' };
    const draft: SocialDraft = {
      product: 'testprod',
      generatedAt: '2026-01-01T00:00:00Z',
      seeds: 1,
      posts: [{ seed, platform: twitter, text: 'You can now see diffs in real time.' }],
    };

    const path = writeSocialDraft(draft, TMP_DIR);
    const result = readSocialDraft(path);

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].text).toBe('You can now see diffs in real time.');
    expect(result.posts[0].seed.type).toBe('capability');
  });
});
