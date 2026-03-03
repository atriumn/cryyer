import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('readline/promises', () => ({
  createInterface: vi.fn(),
}));
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

import { sanitizeId, buildEnvContent, buildSubscribersJson, buildGitignoreContent, main } from '../init.js';
import type { InitAnswers } from '../init.js';
import { createInterface } from 'readline/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';

describe('sanitizeId', () => {
  it('lowercases the input', () => {
    expect(sanitizeId('MyApp')).toBe('myapp');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeId('My App')).toBe('my-app');
  });

  it('replaces special characters with hyphens', () => {
    expect(sanitizeId('My App!')).toBe('my-app');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeId('My  App')).toBe('my-app');
  });

  it('strips leading and trailing hyphens', () => {
    expect(sanitizeId('!MyApp!')).toBe('myapp');
  });

  it('handles numeric characters', () => {
    expect(sanitizeId('App 2.0')).toBe('app-2-0');
  });
});

describe('buildEnvContent', () => {
  const baseAnswers: InitAnswers = {
    productName: 'Acme CLI',
    repo: 'acme/acme-cli',
    voice: 'Casual',
    llmProvider: 'anthropic',
    llmApiKey: 'sk-ant-test',
    subscriberStore: 'json',
    emailProvider: 'resend',
    githubToken: 'ghp_test',
    resendApiKey: 're_test',
    fromEmail: 'updates@acme.dev',
  };

  it('generates env content for anthropic + json store + resend', () => {
    const content = buildEnvContent(baseAnswers);
    expect(content).toContain('GITHUB_TOKEN=ghp_test');
    expect(content).toContain('EMAIL_PROVIDER=resend');
    expect(content).toContain('RESEND_API_KEY=re_test');
    expect(content).toContain('FROM_EMAIL=updates@acme.dev');
    expect(content).toContain('LLM_PROVIDER=anthropic');
    expect(content).toContain('ANTHROPIC_API_KEY=sk-ant-test');
    expect(content).toContain('SUBSCRIBER_STORE=json');
    expect(content).not.toContain('SUPABASE_URL');
    expect(content).not.toContain('GOOGLE_SHEETS');
  });

  it('omits RESEND_API_KEY when email provider is gmail', () => {
    const content = buildEnvContent({ ...baseAnswers, emailProvider: 'gmail', resendApiKey: undefined });
    expect(content).toContain('EMAIL_PROVIDER=gmail');
    expect(content).not.toContain('RESEND_API_KEY');
    expect(content).toContain('FROM_EMAIL=updates@acme.dev');
  });

  it('includes supabase vars when store is supabase', () => {
    const content = buildEnvContent({
      ...baseAnswers,
      subscriberStore: 'supabase',
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'supa_key',
    });
    expect(content).toContain('SUPABASE_URL=https://test.supabase.co');
    expect(content).toContain('SUPABASE_SERVICE_KEY=supa_key');
  });

  it('includes google sheets vars when store is google-sheets', () => {
    const content = buildEnvContent({
      ...baseAnswers,
      subscriberStore: 'google-sheets',
      googleSheetsSpreadsheetId: 'sheet_id',
      googleServiceAccountEmail: 'sa@proj.iam.gserviceaccount.com',
      googlePrivateKey: '-----BEGIN PRIVATE KEY-----',
    });
    expect(content).toContain('GOOGLE_SHEETS_SPREADSHEET_ID=sheet_id');
    expect(content).toContain('GOOGLE_SERVICE_ACCOUNT_EMAIL=sa@proj.iam.gserviceaccount.com');
    expect(content).toContain('GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----');
  });

  it('uses correct key name for openai provider', () => {
    const content = buildEnvContent({
      ...baseAnswers,
      llmProvider: 'openai',
      llmApiKey: 'sk-openai-test',
    });
    expect(content).toContain('LLM_PROVIDER=openai');
    expect(content).toContain('OPENAI_API_KEY=sk-openai-test');
    expect(content).not.toContain('ANTHROPIC_API_KEY');
  });
});

describe('buildSubscribersJson', () => {
  it('generates JSON with the product ID', () => {
    const content = buildSubscribersJson('acme-cli');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual([
      { email: 'alice@example.com', name: 'Alice', productIds: ['acme-cli'] },
    ]);
  });
});

describe('buildGitignoreContent', () => {
  it('creates new .gitignore when none exists', () => {
    const content = buildGitignoreContent(null);
    expect(content).toContain('# cryyer');
    expect(content).toContain('.env');
    expect(content).toContain('subscribers.json');
    expect(content).toContain('email-log.json');
  });

  it('appends missing entries to existing .gitignore', () => {
    const existing = 'node_modules/\n';
    const content = buildGitignoreContent(existing);
    expect(content).toContain('node_modules/');
    expect(content).toContain('# cryyer');
    expect(content).toContain('.env');
  });

  it('does not duplicate entries already in .gitignore', () => {
    const existing = '.env\nsubscribers.json\nemail-log.json\n';
    const content = buildGitignoreContent(existing);
    expect(content).toBe(existing);
  });

  it('only appends entries that are missing', () => {
    const existing = '.env\n';
    const content = buildGitignoreContent(existing);
    expect(content).toContain('# cryyer');
    expect(content).toContain('subscribers.json');
    expect(content).toContain('email-log.json');
    // .env is already there, so it should not appear in the cryyer block
    const cryyerBlock = content.split('# cryyer')[1];
    expect(cryyerBlock).not.toContain('.env');
  });
});

describe('main (init)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function makeRl(answers: string[]) {
    let callIndex = 0;
    const rl = {
      question: vi.fn().mockImplementation(() => Promise.resolve(answers[callIndex++] ?? '')),
      close: vi.fn(),
    };
    (createInterface as Mock).mockReturnValue(rl);
    return rl;
  }

  // Standard answer set for a fresh init: Anthropic + JSON store + Resend
  const freshAnswers = [
    // Product
    'Acme CLI',           // product name
    'acme/acme-cli',      // repo
    'Casual and concise', // voice
    // LLM provider
    '1',                  // anthropic
    'sk-ant-test',        // anthropic key
    // Subscriber store
    '1',                  // json
    // Email provider
    '1',                  // resend
    // Common credentials
    'ghp_test',           // github token
    're_test',            // resend key
    'updates@acme.dev',   // from email
  ];

  function setupFreshDir() {
    // No existing products dir, no existing files
    (existsSync as Mock).mockReturnValue(false);
    (readdirSync as Mock).mockReturnValue([]);
    (readFileSync as Mock).mockImplementation((path: string) => {
      if (path.includes('package.json')) return JSON.stringify({ version: '0.1.5' });
      throw new Error(`Unexpected read: ${path}`);
    });
  }

  it('creates product YAML, .env, subscribers.json, and .gitignore in a fresh directory', async () => {
    setupFreshDir();
    makeRl(freshAnswers);

    await main();

    // Product YAML
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('acme-cli.yaml'),
      expect.stringContaining('acme/acme-cli'),
      'utf-8'
    );

    // .env
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.env'),
      expect.stringContaining('GITHUB_TOKEN=ghp_test'),
      'utf-8'
    );

    // subscribers.json
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('subscribers.json'),
      expect.stringContaining('acme-cli'),
      'utf-8'
    );

    // .gitignore
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.gitignore'),
      expect.stringContaining('# cryyer'),
      'utf-8'
    );
  });

  it('creates products dir if it does not exist', async () => {
    setupFreshDir();
    makeRl(freshAnswers);

    await main();

    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('products'), { recursive: true });
  });

  it('auto-derives product ID from name', async () => {
    setupFreshDir();
    makeRl(freshAnswers);

    await main();

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('acme-cli.yaml'),
      expect.stringContaining('id: acme-cli'),
      'utf-8'
    );
  });

  it('uses default email subject template with product name', async () => {
    setupFreshDir();
    makeRl(freshAnswers);

    await main();

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('acme-cli.yaml'),
      expect.stringContaining('{{weekOf}} Weekly Update — Acme CLI'),
      'utf-8'
    );
  });

  it('handles OpenAI provider selection', async () => {
    setupFreshDir();
    makeRl([
      'Acme CLI', 'acme/acme-cli', 'Casual',
      '2',            // OpenAI
      'sk-openai-test',
      '1',            // JSON store
      '1',            // Resend
      'ghp_test', 're_test', 'updates@acme.dev',
    ]);

    await main();

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.env'),
      expect.stringContaining('LLM_PROVIDER=openai'),
      'utf-8'
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.env'),
      expect.stringContaining('OPENAI_API_KEY=sk-openai-test'),
      'utf-8'
    );
  });

  it('handles Supabase store selection with extra prompts', async () => {
    setupFreshDir();
    makeRl([
      'Acme CLI', 'acme/acme-cli', 'Casual',
      '1', 'sk-ant-test',
      '2',                            // Supabase
      'https://test.supabase.co',     // supabase url
      'supa_key',                     // supabase key
      '1',                            // Resend
      'ghp_test', 're_test', 'updates@acme.dev',
    ]);

    await main();

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.env'),
      expect.stringContaining('SUPABASE_URL=https://test.supabase.co'),
      'utf-8'
    );
    // Should NOT create subscribers.json for supabase
    const subscribersCalls = (writeFileSync as Mock).mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('subscribers.json')
    );
    expect(subscribersCalls).toHaveLength(0);
  });

  it('asks to add another product when products already exist', async () => {
    // products dir exists and has a yaml file
    (existsSync as Mock).mockImplementation((path: string) => {
      if (path.includes('products') && !path.includes('.yaml')) return true;
      return false;
    });
    (readdirSync as Mock).mockReturnValue(['existing-product.yaml']);
    (readFileSync as Mock).mockImplementation((path: string) => {
      if (path.includes('package.json')) return JSON.stringify({ version: '0.1.5' });
      throw new Error(`Unexpected read: ${path}`);
    });

    // Answer 'n' to "Add another product?"
    makeRl(['n']);

    await main();

    // Should not write any files
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('asks to overwrite existing .env', async () => {
    (existsSync as Mock).mockImplementation((path: string) => {
      if (path.includes('.env') && !path.includes('.env.')) return true;
      return false;
    });
    (readdirSync as Mock).mockReturnValue([]);
    (readFileSync as Mock).mockImplementation((path: string) => {
      if (path.includes('package.json')) return JSON.stringify({ version: '0.1.5' });
      throw new Error(`Unexpected read: ${path}`);
    });

    // Full answers + 'N' to overwrite .env
    makeRl([...freshAnswers, 'N']);

    await main();

    // Should NOT have written .env (user declined overwrite)
    const envCalls = (writeFileSync as Mock).mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].endsWith('.env')
    );
    expect(envCalls).toHaveLength(0);
  });

  it('throws when product name is empty', async () => {
    setupFreshDir();
    makeRl(['']); // empty name

    await expect(main()).rejects.toThrow('Product name is required');
  });

  it('throws when repo format is invalid', async () => {
    setupFreshDir();
    makeRl(['My App', 'invalid-repo', 'Friendly']);

    await expect(main()).rejects.toThrow('owner/repo format');
  });

  it('throws when voice is empty', async () => {
    setupFreshDir();
    makeRl(['My App', 'acme/my-app', '']);

    await expect(main()).rejects.toThrow('Voice/tone is required');
  });

  it('throws on invalid LLM provider selection', async () => {
    setupFreshDir();
    makeRl(['My App', 'acme/my-app', 'Casual', '5', 'key']);

    await expect(main()).rejects.toThrow('Invalid selection');
  });

  it('throws when LLM API key is empty', async () => {
    setupFreshDir();
    makeRl(['My App', 'acme/my-app', 'Casual', '1', '']);

    await expect(main()).rejects.toThrow('API key is required');
  });

  it('throws when GitHub token is empty', async () => {
    setupFreshDir();
    makeRl(['My App', 'acme/my-app', 'Casual', '1', 'sk-ant-test', '1', '1', '']);

    await expect(main()).rejects.toThrow('GitHub token is required');
  });

  it('handles Gmail email provider selection (skips Resend key)', async () => {
    setupFreshDir();
    makeRl([
      'Acme CLI', 'acme/acme-cli', 'Casual',
      '1', 'sk-ant-test',        // anthropic
      '1',                        // JSON store
      '2',                        // Gmail
      'ghp_test',                 // github token (no resend key prompt)
      'updates@acme.dev',         // from email
    ]);

    await main();

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.env'),
      expect.stringContaining('EMAIL_PROVIDER=gmail'),
      'utf-8'
    );
    // Should not contain RESEND_API_KEY
    const envCalls = (writeFileSync as Mock).mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].endsWith('.env')
    );
    expect(envCalls.length).toBeGreaterThan(0);
    const envContent = envCalls[0][1] as string;
    expect(envContent).not.toContain('RESEND_API_KEY');
  });

  it('appends cryyer entries to existing .gitignore', async () => {
    const existingGitignore = 'node_modules/\ndist/\n';
    (existsSync as Mock).mockImplementation((path: string) => {
      if (path.includes('.gitignore')) return true;
      return false;
    });
    (readdirSync as Mock).mockReturnValue([]);
    (readFileSync as Mock).mockImplementation((path: string) => {
      if (path.includes('package.json')) return JSON.stringify({ version: '0.1.5' });
      if (path.includes('.gitignore')) return existingGitignore;
      throw new Error(`Unexpected read: ${path}`);
    });

    makeRl(freshAnswers);

    await main();

    // .gitignore should be written with appended entries
    const gitignoreCalls = (writeFileSync as Mock).mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('.gitignore')
    );
    expect(gitignoreCalls.length).toBeGreaterThan(0);
    const content = gitignoreCalls[0][1] as string;
    expect(content).toContain('node_modules/');
    expect(content).toContain('# cryyer');
    expect(content).toContain('.env');
  });
});
