import Anthropic from '@anthropic-ai/sdk';
import type { GitHubChange, Product } from './types.js';

export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export async function draftWeeklyUpdate(
  client: Anthropic,
  product: Product,
  changes: GitHubChange[],
  weekOf: string
): Promise<string> {
  const changeList = changes
    .map((c) => `- [${c.type.toUpperCase()}] ${c.title} (${c.url})`)
    .join('\n');

  const prompt = `You are writing a weekly update email for beta testers of ${product.name}.

Voice/tone: ${product.voice}

Week of: ${weekOf}

Changes this week:
${changeList}

Write a concise, engaging weekly update email body (no subject line) that:
1. Highlights the most impactful changes
2. Uses the specified voice/tone
3. Is friendly and informative for beta testers
4. Keeps it under 300 words`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic API');
  }

  return content.text;
}
