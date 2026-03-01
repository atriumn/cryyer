import { join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { Octokit } from 'octokit';
import { loadProducts } from './config.js';

export interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

export async function checkProducts(productsDir: string): Promise<CheckResult> {
  if (!existsSync(productsDir)) {
    return { name: 'Product configs', passed: false, message: `products/ directory not found: ${productsDir}` };
  }

  let products;
  try {
    products = loadProducts(productsDir);
  } catch (err) {
    return { name: 'Product configs', passed: false, message: `Failed to load products: ${String(err)}` };
  }

  if (products.length === 0) {
    return { name: 'Product configs', passed: false, message: 'No product YAML files found in products/' };
  }

  const errors: string[] = [];
  for (const product of products) {
    if (!product.id) errors.push(`A product is missing the 'id' field`);
    if (!product.name) errors.push(`Product '${product.id}' is missing the 'name' field`);
    if (!product.voice) errors.push(`Product '${product.id}' is missing the 'voice' field`);
    if (!product.repo && !product.githubRepo) errors.push(`Product '${product.id}' is missing the 'repo' field`);
    if (!product.emailSubjectTemplate)
      errors.push(`Product '${product.id}' is missing the 'emailSubjectTemplate' field`);
  }

  if (errors.length > 0) {
    return { name: 'Product configs', passed: false, message: errors.join('; ') };
  }

  return {
    name: 'Product configs',
    passed: true,
    message: `${products.length} product(s) validated successfully`,
  };
}

export async function checkGitHub(): Promise<CheckResult> {
  const token = process.env['GITHUB_TOKEN'];
  if (!token) {
    return { name: 'GitHub token', passed: false, message: 'GITHUB_TOKEN is not set' };
  }

  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.users.getAuthenticated();
    return { name: 'GitHub token', passed: true, message: `Authenticated as ${data.login}` };
  } catch (err) {
    return { name: 'GitHub token', passed: false, message: `Authentication failed: ${String(err)}` };
  }
}

export function checkLLMProvider(): CheckResult {
  const provider = process.env['LLM_PROVIDER'] || 'anthropic';
  const keyMap: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    gemini: 'GEMINI_API_KEY',
  };

  const envKey = keyMap[provider];
  if (!envKey) {
    return {
      name: 'LLM provider',
      passed: false,
      message: `Unknown LLM_PROVIDER: '${provider}'. Supported: anthropic, openai, gemini`,
    };
  }

  const apiKey = process.env[envKey];
  if (!apiKey) {
    return {
      name: 'LLM provider',
      passed: false,
      message: `LLM_PROVIDER is '${provider}' but ${envKey} is not set`,
    };
  }

  return {
    name: 'LLM provider',
    passed: true,
    message: `Provider '${provider}' configured (${envKey} is set)`,
  };
}

export async function checkSubscriberStore(): Promise<CheckResult> {
  const store = process.env['SUBSCRIBER_STORE'] || 'supabase';

  if (store === 'supabase') {
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_SERVICE_KEY'];
    const missing = [!url && 'SUPABASE_URL', !key && 'SUPABASE_SERVICE_KEY'].filter(Boolean).join(', ');
    if (missing) {
      return {
        name: 'Subscriber store',
        passed: false,
        message: `SUBSCRIBER_STORE is 'supabase' but missing: ${missing}`,
      };
    }
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const db = createClient(url!, key!);
      const { error } = await db.from('beta_testers').select('count').limit(0);
      if (error) throw error;
      return { name: 'Subscriber store', passed: true, message: 'Supabase connection verified' };
    } catch (err) {
      return {
        name: 'Subscriber store',
        passed: false,
        message: `Supabase connection failed: ${String(err)}`,
      };
    }
  }

  if (store === 'json') {
    const subscribersPath = process.env['SUBSCRIBERS_JSON_PATH'] || './subscribers.json';
    if (!existsSync(subscribersPath)) {
      return {
        name: 'Subscriber store',
        passed: false,
        message: `SUBSCRIBER_STORE is 'json' but file not found: ${subscribersPath}`,
      };
    }
    return { name: 'Subscriber store', passed: true, message: `JSON file found: ${subscribersPath}` };
  }

  if (store === 'google-sheets') {
    const spreadsheetId = process.env['GOOGLE_SHEETS_SPREADSHEET_ID'];
    const email = process.env['GOOGLE_SERVICE_ACCOUNT_EMAIL'];
    const privateKey = process.env['GOOGLE_PRIVATE_KEY'];
    const missing = [
      !spreadsheetId && 'GOOGLE_SHEETS_SPREADSHEET_ID',
      !email && 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      !privateKey && 'GOOGLE_PRIVATE_KEY',
    ]
      .filter(Boolean)
      .join(', ');
    if (missing) {
      return {
        name: 'Subscriber store',
        passed: false,
        message: `SUBSCRIBER_STORE is 'google-sheets' but missing: ${missing}`,
      };
    }
    return {
      name: 'Subscriber store',
      passed: true,
      message: `Google Sheets credentials are set`,
    };
  }

  return {
    name: 'Subscriber store',
    passed: false,
    message: `Unknown SUBSCRIBER_STORE: '${store}'. Supported: supabase, json, google-sheets`,
  };
}

export function checkEmailConfig(): CheckResult {
  const resendKey = process.env['RESEND_API_KEY'];
  const fromEmail = process.env['FROM_EMAIL'];
  const missing = [!resendKey && 'RESEND_API_KEY', !fromEmail && 'FROM_EMAIL'].filter(Boolean).join(', ');
  if (missing) {
    return { name: 'Email (Resend)', passed: false, message: `Missing required variables: ${missing}` };
  }
  return { name: 'Email (Resend)', passed: true, message: 'RESEND_API_KEY and FROM_EMAIL are set' };
}

export async function runChecks(productsDir?: string): Promise<CheckResult[]> {
  const dir = productsDir ?? join(process.cwd(), 'products');
  const [products, github, subscriber] = await Promise.all([
    checkProducts(dir),
    checkGitHub(),
    checkSubscriberStore(),
  ]);
  const llm = checkLLMProvider();
  const email = checkEmailConfig();
  return [products, github, llm, subscriber, email];
}

async function main(): Promise<void> {
  console.log('\nCryyer Health Check');
  console.log('='.repeat(40));

  const results = await runChecks();

  let allPassed = true;
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (!result.passed) allPassed = false;
  }

  console.log('='.repeat(40));
  if (allPassed) {
    console.log('All checks passed.');
  } else {
    console.log('Some checks failed. Fix the issues above and re-run.');
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
