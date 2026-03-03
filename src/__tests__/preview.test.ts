import { describe, it, expect } from 'vitest';
import { parseArgv, formatActivity } from '../preview.js';
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
