import { describe, it, expect, vi } from 'vitest';
import { isBot, resolveFilter, fetchMergedPRsByLabel, gatherWeeklyActivity } from '../gather.js';
import type { Product } from '../types.js';

describe('isBot', () => {
  it('returns true for known bot logins', () => {
    expect(isBot('dependabot')).toBe(true);
    expect(isBot('dependabot[bot]')).toBe(true);
    expect(isBot('renovate')).toBe(true);
    expect(isBot('renovate[bot]')).toBe(true);
    expect(isBot('github-actions[bot]')).toBe(true);
  });

  it('returns true for any login ending in [bot]', () => {
    expect(isBot('some-custom-app[bot]')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isBot('Dependabot')).toBe(true);
    expect(isBot('DEPENDABOT[BOT]')).toBe(true);
    expect(isBot('Renovate[Bot]')).toBe(true);
  });

  it('returns false for regular users', () => {
    expect(isBot('octocat')).toBe(false);
    expect(isBot('jeff')).toBe(false);
  });

  it('returns false for undefined/empty', () => {
    expect(isBot(undefined)).toBe(false);
    expect(isBot('')).toBe(false);
  });
});

describe('resolveFilter', () => {
  const baseProduct: Product = {
    id: 'test',
    name: 'Test',
    voice: '',
    emailSubjectTemplate: '',
    repo: 'owner/repo',
  };

  it('returns undefined when no filter config exists', () => {
    expect(resolveFilter(baseProduct)).toBeUndefined();
  });

  it('returns filter object when filter is set', () => {
    const product: Product = {
      ...baseProduct,
      filter: { labels: ['admin'], paths: ['apps/admin/'], tag_prefix: 'admin/' },
    };
    expect(resolveFilter(product)).toEqual({
      labels: ['admin'],
      paths: ['apps/admin/'],
      tag_prefix: 'admin/',
    });
  });

  it('falls back to product_filter as label', () => {
    const product: Product = {
      ...baseProduct,
      product_filter: 'legacy-label',
    };
    expect(resolveFilter(product)).toEqual({ labels: ['legacy-label'] });
  });

  it('prefers filter over product_filter', () => {
    const product: Product = {
      ...baseProduct,
      product_filter: 'legacy-label',
      filter: { labels: ['new-label'] },
    };
    expect(resolveFilter(product)).toEqual({ labels: ['new-label'] });
  });
});

describe('fetchMergedPRsByLabel', () => {
  it('constructs correct search query and returns PRs', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  title: 'Add admin feature',
                  body: 'Description',
                  html_url: 'https://github.com/owner/repo/pull/1',
                  pull_request: { merged_at: '2026-02-24T00:00:00Z' },
                  user: { login: 'jeff' },
                },
              ],
            },
          }),
        },
      },
    };

    const result = await fetchMergedPRsByLabel(
      mockOctokit as never,
      'owner',
      'repo',
      '2026-02-23',
      ['admin-portal']
    );

    expect(mockOctokit.rest.search.issuesAndPullRequests).toHaveBeenCalledWith({
      q: 'repo:owner/repo is:pr is:merged merged:>=2026-02-23 label:"admin-portal"',
      per_page: 100,
      sort: 'updated',
      order: 'desc',
    });

    expect(result).toEqual([
      {
        title: 'Add admin feature',
        body: 'Description',
        url: 'https://github.com/owner/repo/pull/1',
        mergedAt: '2026-02-24T00:00:00Z',
        author: 'jeff',
      },
    ]);
  });

  it('supports multiple labels', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockResolvedValue({
            data: { items: [] },
          }),
        },
      },
    };

    await fetchMergedPRsByLabel(mockOctokit as never, 'owner', 'repo', '2026-02-23', [
      'admin',
      'backend',
    ]);

    expect(mockOctokit.rest.search.issuesAndPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'repo:owner/repo is:pr is:merged merged:>=2026-02-23 label:"admin" label:"backend"',
      })
    );
  });

  it('filters out bots', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  title: 'Bot PR',
                  body: null,
                  html_url: 'https://github.com/owner/repo/pull/2',
                  pull_request: { merged_at: '2026-02-24T00:00:00Z' },
                  user: { login: 'dependabot[bot]' },
                },
                {
                  title: 'Human PR',
                  body: null,
                  html_url: 'https://github.com/owner/repo/pull/3',
                  pull_request: { merged_at: '2026-02-24T00:00:00Z' },
                  user: { login: 'jeff' },
                },
              ],
            },
          }),
        },
      },
    };

    const result = await fetchMergedPRsByLabel(mockOctokit as never, 'owner', 'repo', '2026-02-23', [
      'admin',
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].author).toBe('jeff');
  });

  it('returns empty array on API error', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockRejectedValue(new Error('API error')),
        },
      },
    };

    const result = await fetchMergedPRsByLabel(mockOctokit as never, 'owner', 'repo', '2026-02-23', [
      'admin',
    ]);
    expect(result).toEqual([]);
  });
});

describe('gatherWeeklyActivity with filters', () => {
  it('uses label search when filter.labels is set', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  title: 'Filtered PR',
                  body: null,
                  html_url: 'https://github.com/owner/repo/pull/1',
                  pull_request: { merged_at: '2026-02-24T00:00:00Z' },
                  user: { login: 'jeff' },
                },
              ],
            },
          }),
        },
        repos: {
          listReleases: vi.fn().mockResolvedValue({ data: [] }),
          listCommits: vi.fn().mockResolvedValue({ data: [] }),
        },
        pulls: {
          list: vi.fn(),
        },
      },
    };

    const product: Product = {
      id: 'admin',
      name: 'Admin',
      voice: '',
      repo: 'owner/repo',
      emailSubjectTemplate: '',
      filter: { labels: ['admin-portal'] },
    };

    const result = await gatherWeeklyActivity(mockOctokit as never, product, '2026-02-23');

    // Should use search API, not pulls.list
    expect(mockOctokit.rest.search.issuesAndPullRequests).toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.list).not.toHaveBeenCalled();
    expect(result.prs).toHaveLength(1);
    expect(result.prs[0].title).toBe('Filtered PR');
  });

  it('uses pulls.list when no filter is set', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn(),
        },
        repos: {
          listReleases: vi.fn().mockResolvedValue({ data: [] }),
          listCommits: vi.fn().mockResolvedValue({ data: [] }),
        },
        pulls: {
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
    };

    const product: Product = {
      id: 'test',
      name: 'Test',
      voice: '',
      repo: 'owner/repo',
      emailSubjectTemplate: '',
    };

    await gatherWeeklyActivity(mockOctokit as never, product, '2026-02-23');

    expect(mockOctokit.rest.pulls.list).toHaveBeenCalled();
    expect(mockOctokit.rest.search.issuesAndPullRequests).not.toHaveBeenCalled();
  });

  it('filters PRs by path when only paths is set (no labels)', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn(),
        },
        repos: {
          listReleases: vi.fn().mockResolvedValue({ data: [] }),
          listCommits: vi.fn().mockResolvedValue({ data: [] }),
        },
        pulls: {
          list: vi.fn().mockResolvedValue({
            data: [
              {
                number: 1,
                title: 'Update admin dashboard',
                body: null,
                html_url: 'https://github.com/owner/repo/pull/1',
                merged_at: '2026-02-24T00:00:00Z',
                user: { login: 'jeff' },
              },
              {
                number: 2,
                title: 'Update iOS app',
                body: null,
                html_url: 'https://github.com/owner/repo/pull/2',
                merged_at: '2026-02-24T00:00:00Z',
                user: { login: 'jeff' },
              },
            ],
          }),
          listFiles: vi
            .fn()
            .mockResolvedValueOnce({
              data: [
                { filename: 'apps/admin/src/index.ts' },
                { filename: 'apps/admin/src/utils.ts' },
              ],
            })
            .mockResolvedValueOnce({
              data: [
                { filename: 'apps/ios/src/App.swift' },
              ],
            }),
        },
      },
    };

    const product: Product = {
      id: 'admin',
      name: 'Admin',
      voice: '',
      repo: 'owner/repo',
      emailSubjectTemplate: '',
      filter: { paths: ['apps/admin/'] },
    };

    const result = await gatherWeeklyActivity(mockOctokit as never, product, '2026-02-23');

    // Should use pulls.list + listFiles, not search API
    expect(mockOctokit.rest.pulls.list).toHaveBeenCalled();
    expect(mockOctokit.rest.search.issuesAndPullRequests).not.toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledTimes(2);

    // Only the admin PR should be included
    expect(result.prs).toHaveLength(1);
    expect(result.prs[0].title).toBe('Update admin dashboard');
  });

  it('skips PR when listFiles fails', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn(),
        },
        repos: {
          listReleases: vi.fn().mockResolvedValue({ data: [] }),
          listCommits: vi.fn().mockResolvedValue({ data: [] }),
        },
        pulls: {
          list: vi.fn().mockResolvedValue({
            data: [
              {
                number: 1,
                title: 'Some PR',
                body: null,
                html_url: 'https://github.com/owner/repo/pull/1',
                merged_at: '2026-02-24T00:00:00Z',
                user: { login: 'jeff' },
              },
            ],
          }),
          listFiles: vi.fn().mockRejectedValue(new Error('API error')),
        },
      },
    };

    const product: Product = {
      id: 'admin',
      name: 'Admin',
      voice: '',
      repo: 'owner/repo',
      emailSubjectTemplate: '',
      filter: { paths: ['apps/admin/'] },
    };

    const result = await gatherWeeklyActivity(mockOctokit as never, product, '2026-02-23');

    // PR should be excluded since we can't verify its files
    expect(result.prs).toHaveLength(0);
  });

  it('filters releases by tag prefix', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { items: [] } }),
        },
        repos: {
          listReleases: vi.fn().mockResolvedValue({
            data: [
              {
                tag_name: 'admin/v1.2.0',
                name: 'Admin v1.2.0',
                html_url: 'https://github.com/owner/repo/releases/1',
                published_at: '2026-02-25T00:00:00Z',
              },
              {
                tag_name: 'ios/v3.0.0',
                name: 'iOS v3.0.0',
                html_url: 'https://github.com/owner/repo/releases/2',
                published_at: '2026-02-25T00:00:00Z',
              },
              {
                tag_name: 'admin/v1.1.0',
                name: 'Admin v1.1.0',
                html_url: 'https://github.com/owner/repo/releases/3',
                published_at: '2026-02-20T00:00:00Z', // before since
              },
            ],
          }),
          listCommits: vi.fn().mockResolvedValue({ data: [] }),
        },
        pulls: {
          list: vi.fn(),
        },
      },
    };

    const product: Product = {
      id: 'admin',
      name: 'Admin',
      voice: '',
      repo: 'owner/repo',
      emailSubjectTemplate: '',
      filter: { labels: ['admin'], tag_prefix: 'admin/' },
    };

    const result = await gatherWeeklyActivity(mockOctokit as never, product, '2026-02-23');

    // Only the admin release within the date range should be included
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0].tagName).toBe('admin/v1.2.0');
  });

  it('filters commits by path when no PRs or releases found', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { items: [] } }),
        },
        repos: {
          listReleases: vi.fn().mockResolvedValue({ data: [] }),
          listCommits: vi.fn().mockResolvedValue({
            data: [
              {
                sha: 'abc1234567890',
                html_url: 'https://github.com/owner/repo/commit/abc1234',
                commit: { message: 'fix admin bug', author: { name: 'Jeff' } },
                author: { login: 'jeff' },
              },
            ],
          }),
        },
        pulls: {
          list: vi.fn(),
        },
      },
    };

    const product: Product = {
      id: 'admin',
      name: 'Admin',
      voice: '',
      repo: 'owner/repo',
      emailSubjectTemplate: '',
      filter: { labels: ['admin'], paths: ['apps/admin/'] },
    };

    const result = await gatherWeeklyActivity(mockOctokit as never, product, '2026-02-23');

    expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'apps/admin/' })
    );
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].message).toBe('fix admin bug');
  });

  it('deduplicates commits across multiple paths', async () => {
    const sharedCommit = {
      sha: 'abc1234567890',
      html_url: 'https://github.com/owner/repo/commit/abc1234',
      commit: { message: 'shared change', author: { name: 'Jeff' } },
      author: { login: 'jeff' },
    };

    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { items: [] } }),
        },
        repos: {
          listReleases: vi.fn().mockResolvedValue({ data: [] }),
          listCommits: vi
            .fn()
            .mockResolvedValueOnce({ data: [sharedCommit] })
            .mockResolvedValueOnce({ data: [sharedCommit] }),
        },
        pulls: {
          list: vi.fn(),
        },
      },
    };

    const product: Product = {
      id: 'admin',
      name: 'Admin',
      voice: '',
      repo: 'owner/repo',
      emailSubjectTemplate: '',
      filter: { labels: ['admin'], paths: ['apps/admin/', 'libs/shared/'] },
    };

    const result = await gatherWeeklyActivity(mockOctokit as never, product, '2026-02-23');

    expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledTimes(2);
    expect(result.commits).toHaveLength(1);
  });

  it('uses product_filter as label fallback', async () => {
    const mockOctokit = {
      rest: {
        search: {
          issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { items: [] } }),
        },
        repos: {
          listReleases: vi.fn().mockResolvedValue({ data: [] }),
          listCommits: vi.fn().mockResolvedValue({ data: [] }),
        },
        pulls: {
          list: vi.fn(),
        },
      },
    };

    const product: Product = {
      id: 'legacy',
      name: 'Legacy',
      voice: '',
      repo: 'owner/repo',
      emailSubjectTemplate: '',
      product_filter: 'old-label',
    };

    await gatherWeeklyActivity(mockOctokit as never, product, '2026-02-23');

    // Should use search API because product_filter is resolved to labels
    expect(mockOctokit.rest.search.issuesAndPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        q: expect.stringContaining('label:"old-label"'),
      })
    );
    expect(mockOctokit.rest.pulls.list).not.toHaveBeenCalled();
  });
});
