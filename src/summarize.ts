import Anthropic from '@anthropic-ai/sdk';
import type { Product } from './types.js';
import type { GatheredActivity, GatheredPR, GatheredRelease, GatheredCommit } from './gather.js';

export interface DraftResult {
  subject: string;
  body: string;
}

export interface SummarizeOptions {
  model?: 'haiku' | 'sonnet';
}

export async function generateEmailDraft(
  client: Anthropic,
  product: Product,
  activity: GatheredActivity,
  weekOf: string,
  previousUpdate?: string,
  options: SummarizeOptions = {}
): Promise<DraftResult> {
  const modelId =
    options.model === 'sonnet' ? 'claude-3-5-sonnet-latest' : 'claude-3-5-haiku-latest';

  const hasActivity =
    activity.prs.length > 0 || activity.releases.length > 0 || activity.commits.length > 0;

  const activitySection = hasActivity
    ? formatActivity(activity)
    : '(No notable activity this week)';

  const previousUpdateSection = previousUpdate
    ? `\n## Previous Update (for context — avoid repeating the same content)\n${previousUpdate}\n`
    : '';

  const noActivityGuidance = !hasActivity
    ? '\nSince there is no activity this week, write a brief "quiet week" acknowledgment or a forward-looking teaser about what is coming — keeping the product voice consistent.'
    : '';

  const prompt = `You are writing a weekly beta tester update email for ${product.name}.

## Voice & Tone Instructions
${product.voice}

## Week of ${weekOf}

## Activity This Week
${activitySection}${previousUpdateSection}
## Instructions
- Write a concise, engaging email (under 300 words) matching the voice instructions above
- Highlight the most impactful changes for beta testers
- Be friendly and informative${noActivityGuidance}

## Output Format
Respond with ONLY a JSON object — no explanation, no markdown fences, just the raw JSON:
{
  "subject": "<compelling email subject line specific to this week>",
  "body": "<email body in markdown>"
}`;

  const message = await client.messages.create({
    model: modelId,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic API');
  }

  return parseResponse(content.text);
}

function formatActivity(activity: GatheredActivity): string {
  const lines: string[] = [];

  if (activity.releases.length > 0) {
    lines.push('### Releases');
    for (const release of activity.releases as GatheredRelease[]) {
      lines.push(`- ${release.name} (${release.tagName}) — ${release.url}`);
    }
  }

  if (activity.prs.length > 0) {
    lines.push('### Merged Pull Requests');
    for (const pr of activity.prs as GatheredPR[]) {
      lines.push(`- ${pr.title} by @${pr.author} — ${pr.url}`);
    }
  }

  if (activity.commits.length > 0) {
    lines.push('### Notable Commits');
    for (const commit of activity.commits as GatheredCommit[]) {
      lines.push(`- ${commit.message} (${commit.sha}) by @${commit.author}`);
    }
  }

  return lines.join('\n');
}

function parseResponse(text: string): DraftResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse JSON response from LLM');
  }

  const parsed = JSON.parse(jsonMatch[0]) as unknown;

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).subject !== 'string' ||
    typeof (parsed as Record<string, unknown>).body !== 'string'
  ) {
    throw new Error('Invalid response structure from LLM: expected { subject, body }');
  }

  const result = parsed as { subject: string; body: string };
  return { subject: result.subject, body: result.body };
}
