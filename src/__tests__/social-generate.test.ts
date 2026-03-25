import { describe, it, expect, vi } from 'vitest';
import { generateSocialPosts } from '../social/generate.js';
import type { LLMProvider } from '../llm-provider.js';
import type { Product } from '../types.js';
import type { Seed, Platform } from '../social/types.js';

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
  voice: 'Professional, insightful',
};

const product: Product = {
  id: 'noxaudit',
  name: 'NoxAudit',
  social: {
    platforms: ['twitter', 'linkedin'],
    context: 'Architecture review tool',
    cta: { default: 'Try it', link: 'https://noxaudit.dev' },
  },
};

function mockProvider(response: string): LLMProvider {
  return {
    generate: vi.fn(async () => response),
  };
}

describe('generateSocialPosts', () => {
  it('generates one post per seed x platform combination', async () => {
    const seeds: Seed[] = [
      { type: 'pain', text: 'architectural drift' },
      { type: 'insight', text: 'provider rotation' },
    ];
    const provider = mockProvider('Generated post content');

    const posts = await generateSocialPosts(provider, product, seeds, [twitter, linkedin]);

    expect(posts).toHaveLength(4); // 2 seeds x 2 platforms
    expect(provider.generate).toHaveBeenCalledTimes(4);
  });

  it('trims whitespace from LLM response', async () => {
    const seeds: Seed[] = [{ type: 'pain', text: 'drift' }];
    const provider = mockProvider('  trimmed content  \n');

    const posts = await generateSocialPosts(provider, product, seeds, [twitter]);

    expect(posts[0].text).toBe('trimmed content');
  });

  it('uses higher maxTokens for blog type', async () => {
    const seeds: Seed[] = [{ type: 'blog', text: 'deep dive' }];
    const provider = mockProvider('blog content');

    await generateSocialPosts(provider, product, seeds, [twitter]);

    expect(provider.generate).toHaveBeenCalledWith(expect.any(String), 4000);
  });

  it('uses default maxTokens for non-blog types', async () => {
    const seeds: Seed[] = [{ type: 'pain', text: 'drift' }];
    const provider = mockProvider('short content');

    await generateSocialPosts(provider, product, seeds, [twitter]);

    expect(provider.generate).toHaveBeenCalledWith(expect.any(String), 1024);
  });

  it('warns when post exceeds platform maxLength', async () => {
    const longText = 'x'.repeat(300);
    const seeds: Seed[] = [{ type: 'pain', text: 'drift' }];
    const provider = mockProvider(longText);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const posts = await generateSocialPosts(provider, product, seeds, [twitter]);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeds max 280'),
    );
    // Still returns the post despite warning
    expect(posts).toHaveLength(1);
    expect(posts[0].text).toBe(longText);

    warnSpy.mockRestore();
  });

  it('does not warn when post is within maxLength', async () => {
    const seeds: Seed[] = [{ type: 'pain', text: 'drift' }];
    const provider = mockProvider('short');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await generateSocialPosts(provider, product, seeds, [twitter]);

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('attaches correct seed and platform to each post', async () => {
    const seeds: Seed[] = [{ type: 'insight', text: 'rotation' }];
    const provider = mockProvider('content');

    const posts = await generateSocialPosts(provider, product, seeds, [linkedin]);

    expect(posts[0].seed).toEqual({ type: 'insight', text: 'rotation' });
    expect(posts[0].platform.id).toBe('linkedin');
  });

  it('passes activity to update-type seeds', async () => {
    const seeds: Seed[] = [{ type: 'update', text: 'shipped stuff' }];
    const provider: LLMProvider = {
      generate: vi.fn(async (prompt: string) => {
        // update prompt should include activity, not seed text directly
        expect(prompt).toContain('user impact');
        return 'update post';
      }),
    };

    const activity = {
      prs: [{ title: 'Add feature', author: 'jeff', url: 'https://example.com/pr/1', mergedAt: '2026-01-01' }],
      releases: [],
      commits: [],
    };

    const posts = await generateSocialPosts(provider, product, seeds, [twitter], activity);
    expect(posts).toHaveLength(1);
  });

  it('returns empty array for no seeds', async () => {
    const provider = mockProvider('content');
    const posts = await generateSocialPosts(provider, product, [], [twitter]);
    expect(posts).toEqual([]);
  });

  it('returns empty array for no platforms', async () => {
    const seeds: Seed[] = [{ type: 'pain', text: 'drift' }];
    const provider = mockProvider('content');
    const posts = await generateSocialPosts(provider, product, seeds, []);
    expect(posts).toEqual([]);
  });
});
