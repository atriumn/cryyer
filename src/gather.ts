import { Octokit } from 'octokit';
import type { Product } from './types.js';

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

function isBot(login: string | undefined): boolean {
  if (!login) return false;
  return BOT_LOGINS.includes(login.toLowerCase()) || login.toLowerCase().endsWith('[bot]');
}

export async function gatherWeeklyActivity(
  octokit: Octokit,
  product: Product,
  since: string
): Promise<GatheredActivity> {
  const repoStr = product.repo || product.githubRepo;
  if (!repoStr) {
    throw new Error(`Missing repo configuration for product ${product.id}`);
  }
  const [owner, repo] = repoStr.split('/');

  const prs = await fetchMergedPRs(octokit, owner, repo, since);
  const releases = await fetchReleases(octokit, owner, repo, since);

  let commits: GatheredCommit[] = [];
  if (prs.length === 0 && releases.length === 0) {
    commits = await fetchNotableCommits(octokit, owner, repo, since);
  }

  return { prs, releases, commits };
}

async function fetchMergedPRs(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string
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

async function fetchReleases(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string
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
  since: string
): Promise<GatheredCommit[]> {
  try {
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
