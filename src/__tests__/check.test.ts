import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../config.js', () => ({ loadProducts: vi.fn() }));
vi.mock('octokit', () => ({ Octokit: vi.fn(function OctokitMock() {}) }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn() };
});

import { checkProducts, checkGitHub, checkLLMProvider, checkSubscriberStore, checkEmailConfig, runChecks, main } from '../check.js';
import { loadProducts } from '../config.js';
import { Octokit } from 'octokit';
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';

describe('checkProducts', () => {
  beforeEach(() => {
    (existsSync as Mock).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes when all products are valid', async () => {
    (loadProducts as Mock).mockReturnValue([
      {
        id: 'my-app',
        name: 'My App',
        voice: 'Friendly',
        repo: 'owner/my-app',
        emailSubjectTemplate: '{{weekOf}} Update',
      },
    ]);
    const result = await checkProducts('/fake/products');
    expect(result.passed).toBe(true);
    expect(result.message).toContain('1 product');
  });

  it('fails when products directory does not exist', async () => {
    (existsSync as Mock).mockReturnValue(false);
    const result = await checkProducts('/nonexistent');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('fails when no YAML files are found', async () => {
    (loadProducts as Mock).mockReturnValue([]);
    const result = await checkProducts('/fake/products');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('No product YAML');
  });

  it('fails when a product is missing required fields', async () => {
    (loadProducts as Mock).mockReturnValue([{ id: 'test', name: 'Test' }]);
    const result = await checkProducts('/fake/products');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('voice');
  });

  it('fails when loadProducts throws', async () => {
    (loadProducts as Mock).mockImplementation(() => {
      throw new Error('YAML parse error');
    });
    const result = await checkProducts('/fake/products');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('YAML parse error');
  });
});

describe('checkGitHub', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('fails when GITHUB_TOKEN is not set', async () => {
    delete process.env['GITHUB_TOKEN'];
    const result = await checkGitHub();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('GITHUB_TOKEN');
  });

  it('passes when GitHub authentication succeeds', async () => {
    process.env['GITHUB_TOKEN'] = 'valid-token';
    const mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockResolvedValue({ data: { login: 'octocat' } }),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokit;
    });
    const result = await checkGitHub();
    expect(result.passed).toBe(true);
    expect(result.message).toContain('octocat');
  });

  it('fails when GitHub authentication fails', async () => {
    process.env['GITHUB_TOKEN'] = 'bad-token';
    const mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn().mockRejectedValue(new Error('Unauthorized')),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokit;
    });
    const result = await checkGitHub();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('Unauthorized');
  });
});

describe('checkLLMProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('passes when ANTHROPIC_API_KEY is set (default provider)', () => {
    delete process.env['LLM_PROVIDER'];
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    const result = checkLLMProvider();
    expect(result.passed).toBe(true);
    expect(result.message).toContain('anthropic');
  });

  it('fails when ANTHROPIC_API_KEY is missing', () => {
    delete process.env['LLM_PROVIDER'];
    delete process.env['ANTHROPIC_API_KEY'];
    const result = checkLLMProvider();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('ANTHROPIC_API_KEY');
  });

  it('passes when OPENAI_API_KEY is set with openai provider', () => {
    process.env['LLM_PROVIDER'] = 'openai';
    process.env['OPENAI_API_KEY'] = 'sk-test';
    const result = checkLLMProvider();
    expect(result.passed).toBe(true);
    expect(result.message).toContain('openai');
  });

  it('fails for unknown provider', () => {
    process.env['LLM_PROVIDER'] = 'unknown-llm';
    const result = checkLLMProvider();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('unknown-llm');
  });
});

describe('checkSubscriberStore', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('fails when supabase vars are missing (default store)', async () => {
    delete process.env['SUBSCRIBER_STORE'];
    delete process.env['SUPABASE_URL'];
    delete process.env['SUPABASE_SERVICE_KEY'];
    const result = await checkSubscriberStore();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('SUPABASE_URL');
  });

  it('passes when supabase connection succeeds', async () => {
    process.env['SUBSCRIBER_STORE'] = 'supabase';
    process.env['SUPABASE_URL'] = 'https://example.supabase.co';
    process.env['SUPABASE_SERVICE_KEY'] = 'service-key';
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };
    (createClient as Mock).mockReturnValue(mockDb);
    const result = await checkSubscriberStore();
    expect(result.passed).toBe(true);
    expect(result.message).toContain('verified');
  });

  it('fails when supabase connection returns error', async () => {
    process.env['SUBSCRIBER_STORE'] = 'supabase';
    process.env['SUPABASE_URL'] = 'https://example.supabase.co';
    process.env['SUPABASE_SERVICE_KEY'] = 'bad-key';
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ error: new Error('connection refused') }),
        }),
      }),
    };
    (createClient as Mock).mockReturnValue(mockDb);
    const result = await checkSubscriberStore();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('connection refused');
  });

  it('passes when json store file exists', async () => {
    process.env['SUBSCRIBER_STORE'] = 'json';
    process.env['SUBSCRIBERS_JSON_PATH'] = './subscribers.json';
    (existsSync as Mock).mockReturnValue(true);
    const result = await checkSubscriberStore();
    expect(result.passed).toBe(true);
    expect(result.message).toContain('JSON file found');
  });

  it('fails when json store file does not exist', async () => {
    process.env['SUBSCRIBER_STORE'] = 'json';
    process.env['SUBSCRIBERS_JSON_PATH'] = './subscribers.json';
    (existsSync as Mock).mockReturnValue(false);
    const result = await checkSubscriberStore();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('fails for unknown store type', async () => {
    process.env['SUBSCRIBER_STORE'] = 'unknown-store';
    const result = await checkSubscriberStore();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('unknown-store');
  });
});

describe('checkEmailConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('passes when both vars are set', () => {
    process.env['RESEND_API_KEY'] = 're_test';
    process.env['FROM_EMAIL'] = 'updates@example.com';
    const result = checkEmailConfig();
    expect(result.passed).toBe(true);
  });

  it('fails when RESEND_API_KEY is missing', () => {
    delete process.env['RESEND_API_KEY'];
    process.env['FROM_EMAIL'] = 'updates@example.com';
    const result = checkEmailConfig();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('RESEND_API_KEY');
  });

  it('fails when FROM_EMAIL is missing', () => {
    process.env['RESEND_API_KEY'] = 're_test';
    delete process.env['FROM_EMAIL'];
    const result = checkEmailConfig();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('FROM_EMAIL');
  });

  it('passes when gmail vars are set', () => {
    process.env['EMAIL_PROVIDER'] = 'gmail';
    process.env['GMAIL_REFRESH_TOKEN'] = 'token';
    process.env['FROM_EMAIL'] = 'from@test.com';
    const result = checkEmailConfig();
    expect(result.passed).toBe(true);
    expect(result.message).toContain('GMAIL_REFRESH_TOKEN');
  });

  it('fails when gmail refresh token is missing', () => {
    process.env['EMAIL_PROVIDER'] = 'gmail';
    delete process.env['GMAIL_REFRESH_TOKEN'];
    process.env['FROM_EMAIL'] = 'from@test.com';
    const result = checkEmailConfig();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('GMAIL_REFRESH_TOKEN');
  });

  it('fails when gmail FROM_EMAIL is missing', () => {
    process.env['EMAIL_PROVIDER'] = 'gmail';
    process.env['GMAIL_REFRESH_TOKEN'] = 'token';
    delete process.env['FROM_EMAIL'];
    const result = checkEmailConfig();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('FROM_EMAIL');
  });

  it('fails for unknown email provider', () => {
    process.env['EMAIL_PROVIDER'] = 'mailgun';
    const result = checkEmailConfig();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('mailgun');
  });
});

describe('checkSubscriberStore google-sheets', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('passes when all google-sheets vars are set', async () => {
    process.env['SUBSCRIBER_STORE'] = 'google-sheets';
    process.env['GOOGLE_SHEETS_SPREADSHEET_ID'] = 'test-id';
    process.env['GOOGLE_SERVICE_ACCOUNT_EMAIL'] = 'test@example.iam.gserviceaccount.com';
    process.env['GOOGLE_PRIVATE_KEY'] = 'test-key';
    const result = await checkSubscriberStore();
    expect(result.passed).toBe(true);
    expect(result.message).toContain('Google Sheets');
  });

  it('fails when google-sheets vars are missing', async () => {
    process.env['SUBSCRIBER_STORE'] = 'google-sheets';
    delete process.env['GOOGLE_SHEETS_SPREADSHEET_ID'];
    delete process.env['GOOGLE_SERVICE_ACCOUNT_EMAIL'];
    delete process.env['GOOGLE_PRIVATE_KEY'];
    const result = await checkSubscriberStore();
    expect(result.passed).toBe(false);
    expect(result.message).toContain('GOOGLE_SHEETS_SPREADSHEET_ID');
  });
});

describe('runChecks', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as Mock).mockReturnValue(true);
    (loadProducts as Mock).mockReturnValue([
      { id: 'test', name: 'Test', voice: 'v', repo: 'o/r', emailSubjectTemplate: 'T' },
    ]);
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    process.env['SUBSCRIBER_STORE'] = 'json';
    process.env['SUBSCRIBERS_JSON_PATH'] = './subscribers.json';
    process.env['RESEND_API_KEY'] = 're_test';
    process.env['FROM_EMAIL'] = 'from@test.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns results for all five checks', async () => {
    const mockOctokit = {
      rest: { users: { getAuthenticated: vi.fn().mockResolvedValue({ data: { login: 'user' } }) } },
    };
    (Octokit as unknown as Mock).mockImplementation(function () { return mockOctokit; });

    const results = await runChecks('/fake/products');
    expect(results).toHaveLength(5);
    expect(results.map((r) => r.name)).toEqual([
      'Product configs',
      'GitHub token',
      'LLM provider',
      'Subscriber store',
      expect.stringContaining('Email'),
    ]);
  });
});

describe('main', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    (existsSync as Mock).mockReturnValue(true);
    (loadProducts as Mock).mockReturnValue([
      { id: 'test', name: 'Test', voice: 'v', repo: 'o/r', emailSubjectTemplate: 'T' },
    ]);
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    process.env['SUBSCRIBER_STORE'] = 'json';
    process.env['SUBSCRIBERS_JSON_PATH'] = './subscribers.json';
    process.env['RESEND_API_KEY'] = 're_test';
    process.env['FROM_EMAIL'] = 'from@test.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prints check results', async () => {
    const mockOctokit = {
      rest: { users: { getAuthenticated: vi.fn().mockResolvedValue({ data: { login: 'user' } }) } },
    };
    (Octokit as unknown as Mock).mockImplementation(function () { return mockOctokit; });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main();

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('Cryyer Health Check');
    expect(output).toContain('All checks passed');

    consoleSpy.mockRestore();
  });

  it('sets exitCode when checks fail', async () => {
    delete process.env['GITHUB_TOKEN'];
    const mockOctokit = {
      rest: { users: { getAuthenticated: vi.fn().mockRejectedValue(new Error('fail')) } },
    };
    (Octokit as unknown as Mock).mockImplementation(function () { return mockOctokit; });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const origExitCode = process.exitCode;
    await main();

    expect(process.exitCode).toBe(1);
    process.exitCode = origExitCode;

    consoleSpy.mockRestore();
  });
});
