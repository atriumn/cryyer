import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { Product } from './types.js';

export interface Config {
  githubToken: string;
  anthropicApiKey: string;
  resendApiKey: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  fromEmail: string;
}

export function loadConfig(): Config {
  return {
    githubToken: requireEnv('GITHUB_TOKEN'),
    anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
    resendApiKey: requireEnv('RESEND_API_KEY'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceKey: requireEnv('SUPABASE_SERVICE_KEY'),
    fromEmail: requireEnv('FROM_EMAIL'),
  };
}

export function loadProducts(productsDir: string): Product[] {
  const files = readdirSync(productsDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  return files.map((file) => {
    const content = readFileSync(join(productsDir, file), 'utf-8');
    return parseYaml(content) as Product;
  });
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
