import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { Product } from './types.js';

export interface Config {
  githubToken: string;
  resendApiKey: string;
  fromEmail: string;
}

export function loadConfig(): Config {
  return {
    githubToken: requireEnv('GITHUB_TOKEN'),
    resendApiKey: requireEnv('RESEND_API_KEY'),
    fromEmail: requireEnv('FROM_EMAIL'),
  };
}

export function validateProduct(product: Product, file: string): void {
  if (product.audiences?.length) {
    for (const audience of product.audiences) {
      if (!audience.id) throw new Error(`Product "${product.id}" in ${file}: audience missing "id"`);
      if (!audience.voice) throw new Error(`Product "${product.id}" in ${file}: audience "${audience.id}" missing "voice"`);
      if (!audience.emailSubjectTemplate) throw new Error(`Product "${product.id}" in ${file}: audience "${audience.id}" missing "emailSubjectTemplate"`);
    }
  } else {
    if (!product.voice) throw new Error(`Product "${product.id}" in ${file}: missing "voice" (required when no audiences defined)`);
    if (!product.emailSubjectTemplate) throw new Error(`Product "${product.id}" in ${file}: missing "emailSubjectTemplate" (required when no audiences defined)`);
  }
}

export function loadProducts(productsDir: string): Product[] {
  const files = readdirSync(productsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  return files.map((file) => {
    const content = readFileSync(join(productsDir, file), 'utf-8');
    const product = parseYaml(content) as Product;
    validateProduct(product, file);
    return product;
  });
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
