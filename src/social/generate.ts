import type { LLMProvider } from '../llm-provider.js';
import type { Product } from '../types.js';
import type { GatheredActivity } from '../gather.js';
import type { Seed, Platform, SocialPost } from './types.js';
import {
  painPrompt,
  insightPrompt,
  capabilityPrompt,
  proofPrompt,
  updatePrompt,
  blogPrompt,
} from './prompts.js';

function promptForSeed(
  seed: Seed,
  product: Product,
  platform: Platform,
  activity?: GatheredActivity,
): string {
  switch (seed.type) {
    case 'pain':
      return painPrompt(seed, product, platform);
    case 'insight':
      return insightPrompt(seed, product, platform);
    case 'capability':
      return capabilityPrompt(seed, product, platform);
    case 'proof':
      return proofPrompt(seed, product, platform);
    case 'update':
      return updatePrompt(activity ?? { prs: [], releases: [], commits: [] }, product, platform);
    case 'blog':
      return blogPrompt(seed, product, platform);
  }
}

export async function generateSocialPosts(
  provider: LLMProvider,
  product: Product,
  seeds: Seed[],
  platforms: Platform[],
  activity?: GatheredActivity,
): Promise<SocialPost[]> {
  const posts: SocialPost[] = [];

  for (const seed of seeds) {
    for (const platform of platforms) {
      const prompt = promptForSeed(seed, product, platform, activity);
      const maxTokens = seed.type === 'blog' ? 4000 : 1024;
      const raw = await provider.generate(prompt, maxTokens);
      const text = raw.trim();

      if (text.length > platform.maxLength) {
        console.warn(
          `Warning: generated ${seed.type} post for ${platform.id} is ${text.length} chars, exceeds max ${platform.maxLength}`,
        );
      }

      posts.push({ seed, platform, text });
    }
  }

  return posts;
}
