import { describe, it, expect, vi } from 'vitest';
import { formatActivity, parseResponse, generateEmailDraft } from '../summarize.js';
import type { GatheredActivity } from '../gather.js';
import type { LLMProvider } from '../llm-provider.js';
import type { Product, ResolvedAudience } from '../types.js';

describe('formatActivity', () => {
  it('formats releases', () => {
    const activity: GatheredActivity = {
      releases: [{ name: 'v1.0.0', tagName: 'v1.0.0', url: 'https://example.com/release', publishedAt: '2026-01-01' }],
      prs: [],
      commits: [],
    };
    const result = formatActivity(activity);
    expect(result).toContain('### Releases');
    expect(result).toContain('v1.0.0');
    expect(result).toContain('https://example.com/release');
  });

  it('formats merged PRs with author and body summary', () => {
    const activity: GatheredActivity = {
      releases: [],
      prs: [{
        title: 'Add dark mode',
        author: 'jeff',
        url: 'https://example.com/pr/1',
        mergedAt: '2026-01-01',
        body: 'Implements dark mode toggle\nMore details here',
      }],
      commits: [],
    };
    const result = formatActivity(activity);
    expect(result).toContain('### Merged Pull Requests');
    expect(result).toContain('**Add dark mode**');
    expect(result).toContain('@jeff');
    expect(result).toContain('Implements dark mode toggle');
    // Should only include first line of body
    expect(result).not.toContain('More details here');
  });

  it('formats commits as fallback', () => {
    const activity: GatheredActivity = {
      releases: [],
      prs: [],
      commits: [{ message: 'fix typo', sha: 'abc1234', author: 'jeff', url: 'https://example.com/commit' }],
    };
    const result = formatActivity(activity);
    expect(result).toContain('### Notable Commits');
    expect(result).toContain('fix typo');
    expect(result).toContain('abc1234');
  });

  it('returns empty string when no activity', () => {
    const activity: GatheredActivity = { releases: [], prs: [], commits: [] };
    expect(formatActivity(activity)).toBe('');
  });
});

describe('parseResponse', () => {
  it('parses valid JSON with subject and body', () => {
    const input = '{"subject": "Weekly Update", "body": "Hello testers!"}';
    const result = parseResponse(input);
    expect(result).toEqual({ subject: 'Weekly Update', body: 'Hello testers!' });
  });

  it('extracts JSON embedded in surrounding text', () => {
    const input = 'Here is the draft:\n{"subject": "Update", "body": "Content"}\nDone.';
    const result = parseResponse(input);
    expect(result).toEqual({ subject: 'Update', body: 'Content' });
  });

  it('throws on missing JSON', () => {
    expect(() => parseResponse('no json here')).toThrow('Could not parse JSON');
  });

  it('throws on invalid structure (missing body)', () => {
    expect(() => parseResponse('{"subject": "Hello"}')).toThrow('Invalid response structure');
  });

  it('throws on invalid structure (wrong types)', () => {
    expect(() => parseResponse('{"subject": 123, "body": "text"}')).toThrow('Invalid response structure');
  });
});

describe('generateEmailDraft audience voice', () => {
  const mockProduct: Product = {
    id: 'test-app',
    name: 'Test App',
    voice: 'product-level voice',
    repo: 'o/r',
    emailSubjectTemplate: 'Update',
  };
  const emptyActivity: GatheredActivity = { releases: [], prs: [], commits: [] };

  it('uses audience voice when provided', async () => {
    let capturedPrompt = '';
    const mockProvider: LLMProvider = {
      generate: vi.fn(async (prompt: string) => {
        capturedPrompt = prompt;
        return '{"subject": "S", "body": "B"}';
      }),
    };

    const audience: ResolvedAudience = {
      id: 'beta',
      voice: 'audience-level beta voice',
      emailSubjectTemplate: 'Beta Update',
    };

    await generateEmailDraft(mockProvider, mockProduct, emptyActivity, '2024-01-15', undefined, audience);

    expect(capturedPrompt).toContain('audience-level beta voice');
    expect(capturedPrompt).not.toContain('product-level voice');
  });

  it('falls back to product voice when no audience is provided', async () => {
    let capturedPrompt = '';
    const mockProvider: LLMProvider = {
      generate: vi.fn(async (prompt: string) => {
        capturedPrompt = prompt;
        return '{"subject": "S", "body": "B"}';
      }),
    };

    await generateEmailDraft(mockProvider, mockProduct, emptyActivity, '2024-01-15');

    expect(capturedPrompt).toContain('product-level voice');
  });

  it('falls back to product voice when audience has no voice override', async () => {
    const productNoVoice: Product = {
      id: 'test-app',
      name: 'Test App',
      voice: 'fallback voice',
      repo: 'o/r',
      emailSubjectTemplate: 'Update',
    };

    let capturedPrompt = '';
    const mockProvider: LLMProvider = {
      generate: vi.fn(async (prompt: string) => {
        capturedPrompt = prompt;
        return '{"subject": "S", "body": "B"}';
      }),
    };

    const audience: ResolvedAudience = {
      id: undefined,
      voice: 'fallback voice',
      emailSubjectTemplate: 'Update',
    };

    await generateEmailDraft(mockProvider, productNoVoice, emptyActivity, '2024-01-15', undefined, audience);

    expect(capturedPrompt).toContain('fallback voice');
  });
});
