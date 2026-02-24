import type { LLMProvider } from './llm-provider.js';
import type { GitHubChange, Product } from './types.js';

export async function draftWeeklyUpdate(
  provider: LLMProvider,
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

  return provider.generate(prompt, 1024);
}
