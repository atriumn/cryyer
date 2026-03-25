import { describe, it, expect } from 'vitest';
import {
  painPrompt,
  insightPrompt,
  capabilityPrompt,
  proofPrompt,
  updatePrompt,
  blogPrompt,
} from '../social/prompts.js';
import type { Seed, Platform } from '../social/types.js';
import type { Product } from '../types.js';
import type { GatheredActivity } from '../gather.js';

const platform: Platform = {
  id: 'twitter',
  name: 'Twitter',
  maxLength: 280,
  voice: 'Sharp, concise, conversational',
};

const product: Product = {
  id: 'noxaudit',
  name: 'NoxAudit',
  social: {
    platforms: ['twitter'],
    context: 'Architecture review tool for dev teams',
    cta: {
      default: 'Try NoxAudit free',
      link: 'https://noxaudit.dev',
    },
  },
};

const seed: Seed = { type: 'pain', text: 'architectural drift' };

describe('painPrompt', () => {
  it('includes seed text, platform constraints, and product context', () => {
    const result = painPrompt(seed, product, platform);
    expect(result).toContain('architectural drift');
    expect(result).toContain('280');
    expect(result).toContain('Architecture review tool');
    expect(result).toContain("Don't mention the product until the end");
  });

  it('includes CTA', () => {
    const result = painPrompt(seed, product, platform);
    expect(result).toContain('Try NoxAudit free');
    expect(result).toContain('https://noxaudit.dev');
  });

  it('includes output instruction', () => {
    const result = painPrompt(seed, product, platform);
    expect(result).toContain('Respond with ONLY the post text, nothing else');
  });
});

describe('insightPrompt', () => {
  it('includes seed text and insight framing', () => {
    const s: Seed = { type: 'insight', text: 'provider rotation' };
    const result = insightPrompt(s, product, platform);
    expect(result).toContain('provider rotation');
    expect(result).toContain('Be opinionated');
    expect(result).toContain('280');
    expect(result).toContain('Architecture review tool');
  });
});

describe('capabilityPrompt', () => {
  it('includes seed text and capability framing', () => {
    const s: Seed = { type: 'capability', text: 'real-time diff view' };
    const result = capabilityPrompt(s, product, platform);
    expect(result).toContain('real-time diff view');
    expect(result).toContain("what's now possible");
    expect(result).toContain('280');
  });
});

describe('proofPrompt', () => {
  it('includes seed text and proof framing', () => {
    const s: Seed = { type: 'proof', text: '40% reduction in review time' };
    const result = proofPrompt(s, product, platform);
    expect(result).toContain('40% reduction in review time');
    expect(result).toContain('Numbers matter');
    expect(result).toContain('280');
  });
});

describe('updatePrompt', () => {
  it('includes activity summary and update framing', () => {
    const activity: GatheredActivity = {
      releases: [{ name: 'v1.0.0', tagName: 'v1.0.0', url: 'https://example.com', publishedAt: '2026-01-01' }],
      prs: [],
      commits: [],
    };
    const result = updatePrompt(activity, product, platform);
    expect(result).toContain('v1.0.0');
    expect(result).toContain('user impact');
    expect(result).toContain('280');
    expect(result).toContain('Architecture review tool');
  });

  it('handles empty activity', () => {
    const activity: GatheredActivity = { releases: [], prs: [], commits: [] };
    const result = updatePrompt(activity, product, platform);
    expect(result).toContain('No notable activity');
    expect(result).toContain('280');
  });
});

describe('blogPrompt', () => {
  it('includes seed text and blog framing', () => {
    const s: Seed = { type: 'blog', text: 'why architecture reviews matter' };
    const result = blogPrompt(s, product, platform);
    expect(result).toContain('why architecture reviews matter');
    expect(result).toContain('800-1500 words');
    expect(result).toContain('subheadings');
    expect(result).toContain('280');
    expect(result).toContain('Architecture review tool');
  });
});

describe('product without social config', () => {
  it('produces prompts without product context or CTA', () => {
    const bare: Product = { id: 'bare', name: 'Bare' };
    const result = painPrompt(seed, bare, platform);
    expect(result).toContain('architectural drift');
    expect(result).toContain('280');
    // Should not error, just omit context/CTA lines
    expect(result).not.toContain('undefined');
  });
});
