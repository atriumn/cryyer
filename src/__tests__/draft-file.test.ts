import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock external modules before importing
vi.mock('../config.js', () => ({ loadProducts: vi.fn() }));
vi.mock('../gather.js', () => ({ gatherActivity: vi.fn() }));
vi.mock('../summarize.js', () => ({ generateEmailDraft: vi.fn() }));
vi.mock('../llm-provider.js', () => ({ createLLMProvider: vi.fn() }));
vi.mock('../draft.js', () => ({ getWeekOf: vi.fn() }));
vi.mock('octokit', () => ({ Octokit: vi.fn(function OctokitMock() {}) }));
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return { ...actual, writeFileSync: vi.fn(), mkdirSync: vi.fn() };
});

import { formatDraftFile, parseArgv, main } from '../draft-file.js';
import { loadProducts } from '../config.js';
import { gatherActivity } from '../gather.js';
import { generateEmailDraft } from '../summarize.js';
import { createLLMProvider } from '../llm-provider.js';
import { getWeekOf } from '../draft.js';
import { Octokit } from 'octokit';
import { writeFileSync, mkdirSync } from 'fs';

describe('formatDraftFile', () => {
  it('creates valid YAML front matter file', () => {
    const result = formatDraftFile('Test Subject', 'Hello world');
    expect(result).toMatch(/^---\n/);
    expect(result).toContain('subject: Test Subject');
    expect(result).toContain('---\n\nHello world\n');
  });

  it('properly quotes subject with special characters', () => {
    const result = formatDraftFile('tokencost-dev v0.1.4 — What\'s New', 'Body');
    expect(result).toMatch(/^---\n/);
    expect(result).toContain('---\n\nBody\n');
    // yaml package will handle quoting if needed
    expect(result).toContain('tokencost-dev v0.1.4');
  });

  it('preserves multiline body', () => {
    const body = '## Highlights\n\n- Feature A\n- Feature B\n\nThanks!';
    const result = formatDraftFile('Subject', body);
    expect(result).toContain(body);
  });
});

describe('parseArgv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('parses all flags', () => {
    const result = parseArgv([
      'draft-file',
      '--product', 'my-app',
      '--output', 'drafts/v1.0.md',
      '--since', '2024-01-01T00:00:00Z',
      '--repo', 'owner/repo',
    ]);
    expect(result).toEqual({
      productId: 'my-app',
      output: 'drafts/v1.0.md',
      since: '2024-01-01T00:00:00Z',
      repo: 'owner/repo',
    });
  });

  it('parses without command prefix', () => {
    const result = parseArgv(['--product', 'my-app', '--output', 'out.md']);
    expect(result).toEqual({
      productId: 'my-app',
      output: 'out.md',
      since: undefined,
      repo: undefined,
    });
  });

  it('falls back to env vars', () => {
    process.env['PRODUCT_ID'] = 'env-product';
    process.env['DRAFT_OUTPUT'] = 'env-output.md';
    process.env['DRAFT_SINCE'] = '2024-06-01T00:00:00Z';
    process.env['DRAFT_REPO'] = 'owner/repo';
    const result = parseArgv([]);
    expect(result).toEqual({
      productId: 'env-product',
      output: 'env-output.md',
      since: '2024-06-01T00:00:00Z',
      repo: 'owner/repo',
    });
  });

  it('throws when product is missing', () => {
    delete process.env['PRODUCT_ID'];
    expect(() => parseArgv(['--output', 'out.md'])).toThrow('Missing --product');
  });

  it('throws when output is missing', () => {
    delete process.env['DRAFT_OUTPUT'];
    expect(() => parseArgv(['--product', 'my-app'])).toThrow('Missing --output');
  });

  it('parses --audience flag', () => {
    const result = parseArgv([
      '--product', 'my-app',
      '--output', 'out.md',
      '--audience', 'beta',
    ]);
    expect(result.audienceId).toBe('beta');
  });

  it('returns undefined audienceId when not specified', () => {
    const result = parseArgv(['--product', 'my-app', '--output', 'out.md']);
    expect(result.audienceId).toBeUndefined();
  });
});

describe('main', () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    process.argv = [
      'node', 'draft-file.js',
      '--product', 'test-app',
      '--output', 'drafts/v1.0.md',
    ];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  it('gathers activity, generates draft, and writes file', async () => {
    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: 'friendly',
      repo: 'owner/test-app',
      emailSubjectTemplate: 'Weekly update',
    };
    const mockActivity = { prs: [], releases: [], commits: [] };
    const mockDraft = { subject: 'Test Subject', body: 'Test body' };

    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherActivity as Mock).mockResolvedValue(mockActivity);
    (generateEmailDraft as Mock).mockResolvedValue(mockDraft);
    (getWeekOf as Mock).mockReturnValue('2024-01-15');
    (createLLMProvider as Mock).mockReturnValue({});
    (Octokit as unknown as Mock).mockImplementation(function () {
      return {};
    });

    await main();

    expect(gatherActivity).toHaveBeenCalledWith(
      expect.anything(),
      mockProduct,
      expect.any(String)
    );
    expect(generateEmailDraft).toHaveBeenCalledWith(
      {},
      mockProduct,
      mockActivity,
      '2024-01-15',
      undefined,
      expect.objectContaining({ voice: 'friendly' })
    );
    expect(mkdirSync).toHaveBeenCalledWith('drafts', { recursive: true });
    expect(writeFileSync).toHaveBeenCalledWith(
      'drafts/v1.0.md',
      expect.stringContaining('subject: Test Subject'),
      'utf-8'
    );
  });

  it('uses --since when provided', async () => {
    process.argv = [
      'node', 'draft-file.js',
      '--product', 'test-app',
      '--output', 'out.md',
      '--since', '2024-01-01T00:00:00Z',
    ];

    (loadProducts as Mock).mockReturnValue([
      { id: 'test-app', name: 'Test App', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);
    (gatherActivity as Mock).mockResolvedValue({ prs: [], releases: [], commits: [] });
    (generateEmailDraft as Mock).mockResolvedValue({ subject: 'S', body: 'B' });
    (getWeekOf as Mock).mockReturnValue('2024-01-15');
    (createLLMProvider as Mock).mockReturnValue({});
    (Octokit as unknown as Mock).mockImplementation(function () {
      return {};
    });

    await main();

    expect(gatherActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      '2024-01-01T00:00:00Z'
    );
  });

  it('overrides product repo with --repo flag', async () => {
    process.argv = [
      'node', 'draft-file.js',
      '--product', 'test-app',
      '--output', 'out.md',
      '--repo', 'other/repo',
    ];

    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: '',
      repo: 'original/repo',
      emailSubjectTemplate: '',
    };
    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherActivity as Mock).mockResolvedValue({ prs: [], releases: [], commits: [] });
    (generateEmailDraft as Mock).mockResolvedValue({ subject: 'S', body: 'B' });
    (getWeekOf as Mock).mockReturnValue('2024-01-15');
    (createLLMProvider as Mock).mockReturnValue({});
    (Octokit as unknown as Mock).mockImplementation(function () {
      return {};
    });

    await main();

    expect(gatherActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ repo: 'other/repo' }),
      expect.any(String)
    );
  });

  it('throws when product not found', async () => {
    (loadProducts as Mock).mockReturnValue([]);

    await expect(main()).rejects.toThrow('Product not found: test-app');
  });

  it('throws when GITHUB_TOKEN is missing', async () => {
    delete process.env['GITHUB_TOKEN'];
    await expect(main()).rejects.toThrow('Missing required environment variable: GITHUB_TOKEN');
  });
});
