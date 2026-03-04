import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../config.js', () => ({ loadProducts: vi.fn() }));
vi.mock('../gather.js', () => ({ gatherActivity: vi.fn() }));
vi.mock('octokit', () => ({ Octokit: vi.fn(function OctokitMock() {}) }));

import { parseArgv, formatActivity, main } from '../preview.js';
import { loadProducts } from '../config.js';
import { gatherActivity } from '../gather.js';
import { Octokit } from 'octokit';
import type { GatheredActivity } from '../gather.js';

describe('parseArgv', () => {
  it('parses --product flag', () => {
    const result = parseArgv(['--product', 'acme']);
    expect(result.productId).toBe('acme');
  });

  it('parses --since flag', () => {
    const result = parseArgv(['--product', 'acme', '--since', '2024-01-01']);
    expect(result.since).toBe('2024-01-01');
  });

  it('parses --repo flag', () => {
    const result = parseArgv(['--product', 'acme', '--repo', 'org/other']);
    expect(result.repo).toBe('org/other');
  });

  it('strips preview command word', () => {
    const result = parseArgv(['preview', '--product', 'acme']);
    expect(result.productId).toBe('acme');
  });

  it('throws when --product is missing', () => {
    expect(() => parseArgv([])).toThrow('Missing --product');
  });
});

describe('formatActivity', () => {
  it('formats PRs', () => {
    const activity: GatheredActivity = {
      prs: [{ title: 'Add feature', body: '', url: 'https://github.com/pr/1', mergedAt: '2024-01-01', author: 'alice' }],
      releases: [],
      commits: [],
    };
    const output = formatActivity(activity);
    expect(output).toContain('Merged PRs (1)');
    expect(output).toContain('Add feature');
    expect(output).toContain('@alice');
  });

  it('formats releases', () => {
    const activity: GatheredActivity = {
      prs: [],
      releases: [{ name: 'v1.0.0', url: 'https://github.com/releases/1', publishedAt: '2024-01-01', tagName: 'v1.0.0' }],
      commits: [],
    };
    const output = formatActivity(activity);
    expect(output).toContain('Releases (1)');
    expect(output).toContain('v1.0.0');
  });

  it('formats commits', () => {
    const activity: GatheredActivity = {
      prs: [],
      releases: [],
      commits: [{ message: 'fix: typo', url: 'https://github.com/commit/abc', sha: 'abc1234', author: 'bob' }],
    };
    const output = formatActivity(activity);
    expect(output).toContain('Notable Commits (1)');
    expect(output).toContain('abc1234');
    expect(output).toContain('fix: typo');
    expect(output).toContain('@bob');
  });

  it('shows message when no activity found', () => {
    const activity: GatheredActivity = { prs: [], releases: [], commits: [] };
    const output = formatActivity(activity);
    expect(output).toContain('No activity found');
  });
});

describe('main', () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.argv = ['node', 'preview.js', '--product', 'test-app'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  it('gathers and prints activity for a product', async () => {
    const mockProduct = { id: 'test-app', name: 'Test App', voice: '', repo: 'owner/test-app', emailSubjectTemplate: '' };
    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherActivity as Mock).mockResolvedValue({
      prs: [{ title: 'Add feature', body: '', url: 'https://pr/1', mergedAt: '2024-01-01', author: 'alice' }],
      releases: [],
      commits: [],
    });
    (Octokit as unknown as Mock).mockImplementation(function () { return {}; });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main();

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('Test App');
    expect(output).toContain('Total: 1 item');

    consoleSpy.mockRestore();
  });

  it('throws when GITHUB_TOKEN is missing', async () => {
    delete process.env['GITHUB_TOKEN'];
    await expect(main()).rejects.toThrow('GITHUB_TOKEN');
  });

  it('throws when product is not found', async () => {
    (loadProducts as Mock).mockReturnValue([]);
    (Octokit as unknown as Mock).mockImplementation(function () { return {}; });
    await expect(main()).rejects.toThrow('Product not found');
  });

  it('applies --repo override', async () => {
    process.argv = ['node', 'preview.js', '--product', 'test-app', '--repo', 'org/other'];
    const mockProduct = { id: 'test-app', name: 'Test App', voice: '', repo: 'owner/test-app', emailSubjectTemplate: '' };
    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherActivity as Mock).mockResolvedValue({ prs: [], releases: [], commits: [] });
    (Octokit as unknown as Mock).mockImplementation(function () { return {}; });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main();

    // Product repo should have been overridden
    expect(mockProduct.repo).toBe('org/other');

    consoleSpy.mockRestore();
  });
});
