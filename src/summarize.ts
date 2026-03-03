import type { LLMProvider } from './llm-provider.js';
import type { Product } from './types.js';
import type { GatheredActivity, GatheredPR, GatheredRelease, GatheredCommit } from './gather.js';

export interface DraftResult {
  subject: string;
  body: string;
}

export async function generateEmailDraft(
  provider: LLMProvider,
  product: Product,
  activity: GatheredActivity,
  weekOf: string,
  previousUpdate?: string,
): Promise<DraftResult> {
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

  const taglineLine = product.tagline ? `\n**Tagline:** ${product.tagline}` : '';

  const prompt = `You are writing a weekly beta tester update email for ${product.name}.${taglineLine}

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

  const text = await provider.generate(prompt, 1024);
  return parseResponse(text);
}

export function formatActivity(activity: GatheredActivity): string {
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
      lines.push(`- **${pr.title}** by @${pr.author} — ${pr.url}`);
      if (pr.body) {
        const summary = pr.body.split('\n')[0].trim();
        if (summary) {
          lines.push(`  ${summary}`);
        }
      }
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

export function parseResponse(text: string): DraftResult {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

  // Try parsing the cleaned text directly first
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fall back to extracting the first JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Could not parse JSON response from LLM. Raw response:\n${text}`);
    }
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error(`Could not parse JSON response from LLM. Raw response:\n${text}`);
    }
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).subject !== 'string' ||
    typeof (parsed as Record<string, unknown>).body !== 'string'
  ) {
    throw new Error(`Invalid response structure from LLM: expected { subject, body }. Raw response:\n${text}`);
  }

  const result = parsed as { subject: string; body: string };
  return { subject: result.subject, body: result.body };
}
