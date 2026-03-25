import type { Seed, Platform } from './types.js';
import type { Product } from '../types.js';
import type { GatheredActivity } from '../gather.js';
import { formatActivity } from '../summarize.js';

function platformBlock(platform: Platform): string {
  return `Platform: ${platform.name}
Max length: ${platform.maxLength} characters
Voice/style: ${platform.voice}`;
}

function productBlock(product: Product): string {
  const ctx = product.social?.context ?? '';
  const cta = product.social?.cta;
  const lines: string[] = [];
  if (ctx) {
    lines.push(`Product context: ${ctx}`);
  }
  if (cta) {
    lines.push(`CTA: ${cta.default}`);
    lines.push(`Link: ${cta.link}`);
  }
  return lines.join('\n');
}

const OUTPUT_INSTRUCTION = 'Respond with ONLY the post text, nothing else.';

export function painPrompt(seed: Seed, product: Product, platform: Platform): string {
  return `${platformBlock(platform)}

${productBlock(product)}

Frame this as a problem the reader recognizes. Don't mention the product until the end.

Seed: ${seed.text}

${OUTPUT_INSTRUCTION}`;
}

export function insightPrompt(seed: Seed, product: Product, platform: Platform): string {
  return `${platformBlock(platform)}

${productBlock(product)}

Share this as a learned perspective. Be opinionated.

Seed: ${seed.text}

${OUTPUT_INSTRUCTION}`;
}

export function capabilityPrompt(seed: Seed, product: Product, platform: Platform): string {
  return `${platformBlock(platform)}

${productBlock(product)}

Lead with what's now possible, not with the feature name.

Seed: ${seed.text}

${OUTPUT_INSTRUCTION}`;
}

export function proofPrompt(seed: Seed, product: Product, platform: Platform): string {
  return `${platformBlock(platform)}

${productBlock(product)}

Lead with the result. Be specific. Numbers matter.

Seed: ${seed.text}

${OUTPUT_INSTRUCTION}`;
}

export function updatePrompt(activity: GatheredActivity, product: Product, platform: Platform): string {
  const summary = formatActivity(activity);
  return `${platformBlock(platform)}

${productBlock(product)}

Summarize what shipped. Focus on user impact, not implementation.

Activity:
${summary || '(No notable activity)'}

${OUTPUT_INSTRUCTION}`;
}

export function blogPrompt(seed: Seed, product: Product, platform: Platform): string {
  return `${platformBlock(platform)}

${productBlock(product)}

800-1500 words. Structure: hook, body (concrete examples), conclusion with CTA. Use subheadings. No fluff.

Seed: ${seed.text}

${OUTPUT_INSTRUCTION}`;
}
