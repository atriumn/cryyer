import { Octokit } from 'octokit';
import type { Product, ProductFilter } from './types.js';

export interface GatheredPR {
  title: string;
  body?: string;
  url: string;
  mergedAt: string;
  author: string;
}

export interface GatheredRelease {
  name: string;
  url: string;
  publishedAt: string;
  tagName: string;
}

export interface GatheredCommit {
  message: string;
  url: string;
  sha: string;
  author: string;
}

export interface GatheredActivity {
  prs: GatheredPR[];
  releases: GatheredRelease[];
  commits: GatheredCommit[];
}

const BOT_LOGINS = ['dependabot', 'dependabot[bot]', 'renovate', 'renovate[bot]', 'github-actions[bot]'];

export function isBot(login: string | undefined): boolean {
  if (!login) return false;
  return BOT_LOGINS.includes(login.toLowerCase()) || login.toLowerCase().endsWith('[bot]');
}

export function resolveFilter(product: Product): ProductFilter | undefined {
  if (product.filter) return product.filter;
  if (product.product_filter) return { labels: [product.product_filter] };
  return undefined;
}

export async function gatherActivity(
  octokit: Octokit,
  product: Product,
  since: string
): Promise<GatheredActivity> {
  const repoStr = product.repo || product.githubRepo;
  if (!repoStr) {
    throw new Error(`Missing repo configuration for product ${product.id}`);
  }
  const [owner, repo] = repoStr.split('/');
  const filter = resolveFilter(product);

  let prs: GatheredPR[];
  if (filter?.labels?.length) {
    prs = await fetchMergedPRsByLabel(octokit, owner, repo, since, filter.labels);
  } else {
    prs = await fetchMergedPRs(octokit, owner, repo, since, filter?.paths);
  }

  const releases = await fetchReleases(octokit, owner, repo, since, filter?.tag_prefix);

  let commits: GatheredCommit[] = [];
  if (prs.length === 0 && releases.length === 0) {
    commits = await fetchNotableCommits(octokit, owner, repo, since, filter?.paths);
  }

  return { prs, releases, commits };
}

async function fetchMergedPRs(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
  paths?: string[]
): Promise<GatheredPR[]> {
  try {
    const { data: pulls } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    });

    const sinceDate = new Date(since);
    const prs: GatheredPR[] = [];

    for (const pr of pulls) {
      if (!pr.merged_at) continue;
      if (new Date(pr.merged_at) < sinceDate) continue;
      if (isBot(pr.user?.login)) continue;

      if (paths?.length) {
        const touches = await prTouchesPaths(octokit, owner, repo, pr.number, paths);
        if (!touches) continue;
      }

      prs.push({
        title: pr.title,
        body: pr.body ?? undefined,
        url: pr.html_url,
        mergedAt: pr.merged_at,
        author: pr.user?.login ?? 'unknown',
      });
    }

    return prs;
  } catch {
    return [];
  }
}

async function prTouchesPaths(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  paths: string[]
): Promise<boolean> {
  try {
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });
    return files.some((f) => paths.some((p) => f.filename.startsWith(p)));
  } catch {
    return false;
  }
}

export async function fetchMergedPRsByLabel(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
  labels: string[]
): Promise<GatheredPR[]> {
  try {
    const labelQuery = labels.map((l) => `label:"${l}"`).join(' ');
    const q = `repo:${owner}/${repo} is:pr is:merged merged:>=${since} ${labelQuery}`;
    const { data } = await octokit.rest.search.issuesAndPullRequests({
      q,
      per_page: 100,
      sort: 'updated',
      order: 'desc',
    });

    return data.items
      .filter((item) => !isBot(item.user?.login))
      .map((item) => ({
        title: item.title,
        body: item.body ?? undefined,
        url: item.html_url,
        mergedAt: item.pull_request?.merged_at ?? '',
        author: item.user?.login ?? 'unknown',
      }));
  } catch {
    return [];
  }
}

async function fetchReleases(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
  tagPrefix?: string
): Promise<GatheredRelease[]> {
  try {
    const { data: releases } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 100,
    });

    const sinceDate = new Date(since);
    const result: GatheredRelease[] = [];

    for (const release of releases) {
      if (!release.published_at) continue;
      if (new Date(release.published_at) < sinceDate) continue;
      if (tagPrefix && !release.tag_name.startsWith(tagPrefix)) continue;

      result.push({
        name: release.name ?? release.tag_name,
        url: release.html_url,
        publishedAt: release.published_at,
        tagName: release.tag_name,
      });
    }

    return result;
  } catch {
    return [];
  }
}

async function fetchNotableCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string,
  paths?: string[]
): Promise<GatheredCommit[]> {
  try {
    if (paths?.length) {
      const seen = new Set<string>();
      const result: GatheredCommit[] = [];

      for (const path of paths) {
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner,
          repo,
          since,
          path,
          per_page: 20,
        });

        for (const c of commits) {
          if (seen.has(c.sha)) continue;
          seen.add(c.sha);
          if (isBot(c.author?.login)) continue;
          result.push({
            message: c.commit.message.split('\n')[0],
            url: c.html_url,
            sha: c.sha.slice(0, 7),
            author: c.author?.login ?? c.commit.author?.name ?? 'unknown',
          });
        }
      }

      return result;
    }

    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since,
      per_page: 20,
    });

    return commits
      .filter((c) => !isBot(c.author?.login))
      .map((c) => ({
        message: c.commit.message.split('\n')[0],
        url: c.html_url,
        sha: c.sha.slice(0, 7),
        author: c.author?.login ?? c.commit.author?.name ?? 'unknown',
      }));
  } catch {
    return [];
  }
}
