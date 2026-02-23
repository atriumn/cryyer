import { Octokit } from 'octokit';
import type { GitHubChange } from './types.js';

export function createGitHubClient(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function fetchWeeklyChanges(
  octokit: Octokit,
  owner: string,
  repo: string,
  since: string
): Promise<GitHubChange[]> {
  const changes: GitHubChange[] = [];

  const { data: closedIssues } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: 'closed',
    since,
    per_page: 100,
  });

  for (const issue of closedIssues) {
    if (issue.pull_request) {
      changes.push({
        title: issue.title,
        url: issue.html_url,
        type: 'pr',
        mergedAt: issue.pull_request.merged_at ?? undefined,
      });
    } else {
      changes.push({
        title: issue.title,
        url: issue.html_url,
        type: 'issue',
        closedAt: issue.closed_at ?? undefined,
      });
    }
  }

  return changes;
}
