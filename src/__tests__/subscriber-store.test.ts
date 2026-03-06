import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const mockFrom = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

// --- Octokit / Gist mocks ---
const mockGistGet = vi.fn();
const mockGistUpdate = vi.fn();
vi.mock('octokit', () => ({
  Octokit: class MockOctokit {
    rest = {
      gists: {
        get: mockGistGet,
        update: mockGistUpdate,
      },
    };
  },
}));

// --- Google Sheets mocks ---
const mockAddRow = vi.fn();
const mockSheetsByTitle: Record<string, unknown> = {};
const mockSheetsByIndex: unknown[] = [];

vi.mock('google-spreadsheet', () => ({
  GoogleSpreadsheet: class MockGoogleSpreadsheet {
    async loadInfo() {}
    get sheetsByTitle() { return mockSheetsByTitle; }
    get sheetsByIndex() { return mockSheetsByIndex; }
  },
}));

vi.mock('google-auth-library', () => ({
  JWT: class MockJWT {},
  OAuth2Client: class MockOAuth2Client {
    setCredentials() {}
    async getAccessToken() { return { token: 'mock-token' }; }
  },
}));

import { createSubscriberStore, SupabaseStore, JsonFileStore, GoogleSheetsStore, GistStore } from '../subscriber-store.js';

describe('createSubscriberStore', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to supabase when SUBSCRIBER_STORE is not set', () => {
    delete process.env.SUBSCRIBER_STORE;
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-key';
    const store = createSubscriberStore();
    expect(store).toBeInstanceOf(SupabaseStore);
  });

  it('creates SupabaseStore when SUBSCRIBER_STORE=supabase', () => {
    process.env.SUBSCRIBER_STORE = 'supabase';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-key';
    const store = createSubscriberStore();
    expect(store).toBeInstanceOf(SupabaseStore);
  });

  it('creates JsonFileStore when SUBSCRIBER_STORE=json', () => {
    process.env.SUBSCRIBER_STORE = 'json';
    const store = createSubscriberStore();
    expect(store).toBeInstanceOf(JsonFileStore);
  });

  it('creates GoogleSheetsStore when SUBSCRIBER_STORE=google-sheets', () => {
    process.env.SUBSCRIBER_STORE = 'google-sheets';
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-id';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    const store = createSubscriberStore();
    expect(store).toBeInstanceOf(GoogleSheetsStore);
  });

  it('throws on unknown store type', () => {
    process.env.SUBSCRIBER_STORE = 'unknown';
    expect(() => createSubscriberStore()).toThrow('Unknown subscriber store: unknown');
  });

  it('throws when SUPABASE_URL is missing for supabase', () => {
    delete process.env.SUPABASE_URL;
    process.env.SUBSCRIBER_STORE = 'supabase';
    process.env.SUPABASE_SERVICE_KEY = 'test-key';
    expect(() => createSubscriberStore()).toThrow('Missing SUPABASE_URL');
  });

  it('throws when SUPABASE_SERVICE_KEY is missing for supabase', () => {
    process.env.SUBSCRIBER_STORE = 'supabase';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.SUPABASE_SERVICE_KEY;
    expect(() => createSubscriberStore()).toThrow('Missing SUPABASE_SERVICE_KEY');
  });

  it('throws when GOOGLE_SHEETS_SPREADSHEET_ID is missing for google-sheets', () => {
    process.env.SUBSCRIBER_STORE = 'google-sheets';
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    expect(() => createSubscriberStore()).toThrow('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  });

  it('throws when GOOGLE_SERVICE_ACCOUNT_EMAIL is missing for google-sheets', () => {
    process.env.SUBSCRIBER_STORE = 'google-sheets';
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-id';
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    process.env.GOOGLE_PRIVATE_KEY = 'test-key';
    expect(() => createSubscriberStore()).toThrow('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL');
  });

  it('throws when GOOGLE_PRIVATE_KEY is missing for google-sheets', () => {
    process.env.SUBSCRIBER_STORE = 'google-sheets';
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-id';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com';
    delete process.env.GOOGLE_PRIVATE_KEY;
    expect(() => createSubscriberStore()).toThrow('Missing GOOGLE_PRIVATE_KEY');
  });

  it('accepts overrides for store type', () => {
    const store = createSubscriberStore({ store: 'json' });
    expect(store).toBeInstanceOf(JsonFileStore);
  });

  it('overrides take precedence over env vars', () => {
    process.env.SUBSCRIBER_STORE = 'supabase';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-key';
    const store = createSubscriberStore({ store: 'json' });
    expect(store).toBeInstanceOf(JsonFileStore);
  });
});

describe('JsonFileStore.addSubscriber', () => {
  const tmpPath = join(tmpdir(), `cryyer-test-subscribers-${Date.now()}.json`);

  afterEach(() => {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
  });

  it('adds a new subscriber to an empty file', async () => {
    writeFileSync(tmpPath, '[]');
    const store = new JsonFileStore(tmpPath);
    await store.addSubscriber('my-app', 'alice@example.com', 'Alice');

    const data = JSON.parse(readFileSync(tmpPath, 'utf-8'));
    expect(data).toEqual([
      { email: 'alice@example.com', name: 'Alice', productIds: ['my-app'] },
    ]);
  });

  it('creates file if it does not exist', async () => {
    const store = new JsonFileStore(tmpPath);
    await store.addSubscriber('my-app', 'alice@example.com');

    const data = JSON.parse(readFileSync(tmpPath, 'utf-8'));
    expect(data).toHaveLength(1);
    expect(data[0].email).toBe('alice@example.com');
    expect(data[0].productIds).toEqual(['my-app']);
  });

  it('appends productId to existing subscriber', async () => {
    writeFileSync(tmpPath, JSON.stringify([
      { email: 'alice@example.com', name: 'Alice', productIds: ['app-a'] },
    ]));
    const store = new JsonFileStore(tmpPath);
    await store.addSubscriber('app-b', 'alice@example.com');

    const data = JSON.parse(readFileSync(tmpPath, 'utf-8'));
    expect(data).toHaveLength(1);
    expect(data[0].productIds).toEqual(['app-a', 'app-b']);
  });

  it('does not duplicate productId', async () => {
    writeFileSync(tmpPath, JSON.stringify([
      { email: 'alice@example.com', name: 'Alice', productIds: ['my-app'] },
    ]));
    const store = new JsonFileStore(tmpPath);
    await store.addSubscriber('my-app', 'alice@example.com');

    const data = JSON.parse(readFileSync(tmpPath, 'utf-8'));
    expect(data[0].productIds).toEqual(['my-app']);
  });
});

describe('JsonFileStore.removeSubscriber', () => {
  const tmpPath = join(tmpdir(), `cryyer-test-subscribers-rm-${Date.now()}.json`);

  afterEach(() => {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
  });

  it('removes productId from subscriber', async () => {
    writeFileSync(tmpPath, JSON.stringify([
      { email: 'alice@example.com', name: 'Alice', productIds: ['app-a', 'app-b'] },
    ]));
    const store = new JsonFileStore(tmpPath);
    await store.removeSubscriber('app-a', 'alice@example.com');

    const data = JSON.parse(readFileSync(tmpPath, 'utf-8'));
    expect(data).toHaveLength(1);
    expect(data[0].productIds).toEqual(['app-b']);
  });

  it('removes entry entirely when no productIds left', async () => {
    writeFileSync(tmpPath, JSON.stringify([
      { email: 'alice@example.com', name: 'Alice', productIds: ['my-app'] },
    ]));
    const store = new JsonFileStore(tmpPath);
    await store.removeSubscriber('my-app', 'alice@example.com');

    const data = JSON.parse(readFileSync(tmpPath, 'utf-8'));
    expect(data).toEqual([]);
  });

  it('does nothing when file does not exist', async () => {
    const store = new JsonFileStore(tmpPath);
    await expect(store.removeSubscriber('my-app', 'alice@example.com')).resolves.toBeUndefined();
  });

  it('does nothing when email not found', async () => {
    writeFileSync(tmpPath, JSON.stringify([
      { email: 'bob@example.com', productIds: ['my-app'] },
    ]));
    const store = new JsonFileStore(tmpPath);
    await store.removeSubscriber('my-app', 'alice@example.com');

    const data = JSON.parse(readFileSync(tmpPath, 'utf-8'));
    expect(data).toHaveLength(1);
  });
});

describe('JsonFileStore.getSubscribers', () => {
  const tmpPath = join(tmpdir(), `cryyer-test-subs-get-${Date.now()}.json`);

  afterEach(() => {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
  });

  it('returns subscribers matching productId', async () => {
    writeFileSync(tmpPath, JSON.stringify([
      { email: 'alice@example.com', name: 'Alice', productIds: ['my-app', 'other'] },
      { email: 'bob@example.com', productIds: ['other'] },
      { email: 'carol@example.com', productIds: ['my-app'] },
    ]));
    const store = new JsonFileStore(tmpPath);
    const subs = await store.getSubscribers('my-app');
    expect(subs).toHaveLength(2);
    expect(subs.map((s) => s.email)).toEqual(['alice@example.com', 'carol@example.com']);
    expect(subs[0].name).toBe('Alice');
  });

  it('returns empty array when file does not exist', async () => {
    const store = new JsonFileStore('/tmp/cryyer-nonexistent.json');
    const subs = await store.getSubscribers('my-app');
    expect(subs).toEqual([]);
  });

  it('returns empty array when no subscribers match', async () => {
    writeFileSync(tmpPath, JSON.stringify([
      { email: 'alice@example.com', productIds: ['other-app'] },
    ]));
    const store = new JsonFileStore(tmpPath);
    const subs = await store.getSubscribers('my-app');
    expect(subs).toEqual([]);
  });

  it('works with compound audience keys', async () => {
    writeFileSync(tmpPath, JSON.stringify([
      { email: 'alice@example.com', productIds: ['my-app:beta'] },
      { email: 'bob@example.com', productIds: ['my-app:enterprise'] },
    ]));
    const store = new JsonFileStore(tmpPath);
    const subs = await store.getSubscribers('my-app:beta');
    expect(subs).toHaveLength(1);
    expect(subs[0].email).toBe('alice@example.com');
  });
});

describe('JsonFileStore.recordEmailSent', () => {
  const tmpLogPath = join(tmpdir(), `cryyer-test-log-${Date.now()}.json`);

  afterEach(() => {
    if (existsSync(tmpLogPath)) unlinkSync(tmpLogPath);
  });

  it('creates log file and appends entry', async () => {
    const store = new JsonFileStore(undefined, tmpLogPath);
    await store.recordEmailSent('alice@example.com', 'my-app', '2024-01-15');

    const log = JSON.parse(readFileSync(tmpLogPath, 'utf-8'));
    expect(log).toHaveLength(1);
    expect(log[0].email).toBe('alice@example.com');
    expect(log[0].productId).toBe('my-app');
    expect(log[0].weekOf).toBe('2024-01-15');
    expect(log[0].sentAt).toBeDefined();
  });

  it('appends to existing log', async () => {
    writeFileSync(tmpLogPath, JSON.stringify([{ email: 'old@test.com', productId: 'x', weekOf: '2024-01-08', sentAt: '2024-01-08T00:00:00Z' }]));
    const store = new JsonFileStore(undefined, tmpLogPath);
    await store.recordEmailSent('new@test.com', 'my-app', '2024-01-15');

    const log = JSON.parse(readFileSync(tmpLogPath, 'utf-8'));
    expect(log).toHaveLength(2);
  });
});

describe('SupabaseStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSubscribers queries beta_testers table', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        data: [{ email: 'alice@test.com', name: 'Alice' }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(mockChain);

    const store = new SupabaseStore('https://test.supabase.co', 'key');
    const subs = await store.getSubscribers('my-app');

    expect(mockFrom).toHaveBeenCalledWith('beta_testers');
    expect(mockChain.select).toHaveBeenCalledWith('email, name');
    expect(mockChain.eq).toHaveBeenCalledWith('product', 'my-app');
    expect(subs).toEqual([{ email: 'alice@test.com', name: 'Alice' }]);
  });

  it('getSubscribers throws on error', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('connection refused'),
      }),
    };
    mockFrom.mockReturnValue(mockChain);

    const store = new SupabaseStore('https://test.supabase.co', 'key');
    await expect(store.getSubscribers('my-app')).rejects.toThrow('connection refused');
  });

  it('getSubscribers returns empty array and warns when no subscribers', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(mockChain);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = new SupabaseStore('https://test.supabase.co', 'key');
    const subs = await store.getSubscribers('my-app');

    expect(subs).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('recordEmailSent inserts into email_log table', async () => {
    const mockChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(mockChain);

    const store = new SupabaseStore('https://test.supabase.co', 'key');
    await store.recordEmailSent('alice@test.com', 'my-app', '2024-01-15');

    expect(mockFrom).toHaveBeenCalledWith('email_log');
    expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      tester_id: 'alice@test.com',
      product_id: 'my-app',
      week_of: '2024-01-15',
    }));
  });

  it('recordEmailSent throws on error', async () => {
    const mockChain = {
      insert: vi.fn().mockResolvedValue({ error: new Error('insert failed') }),
    };
    mockFrom.mockReturnValue(mockChain);

    const store = new SupabaseStore('https://test.supabase.co', 'key');
    await expect(store.recordEmailSent('a@b.com', 'x', '2024-01-15')).rejects.toThrow('insert failed');
  });

  it('addSubscriber inserts into beta_testers table', async () => {
    const mockChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(mockChain);

    const store = new SupabaseStore('https://test.supabase.co', 'key');
    await store.addSubscriber('my-app', 'alice@test.com', 'Alice');

    expect(mockFrom).toHaveBeenCalledWith('beta_testers');
    expect(mockChain.insert).toHaveBeenCalledWith({
      email: 'alice@test.com',
      name: 'Alice',
      product: 'my-app',
    });
  });

  it('removeSubscriber soft-deletes by setting unsubscribed_at', async () => {
    const mockChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // The last .eq() call resolves the chain
    let eqCallCount = 0;
    mockChain.eq = vi.fn().mockImplementation(() => {
      eqCallCount++;
      if (eqCallCount >= 2) {
        return Promise.resolve({ error: null });
      }
      return mockChain;
    });
    mockFrom.mockReturnValue(mockChain);

    const store = new SupabaseStore('https://test.supabase.co', 'key');
    await store.removeSubscriber('my-app', 'alice@test.com');

    expect(mockFrom).toHaveBeenCalledWith('beta_testers');
    expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
      unsubscribed_at: expect.any(String),
    }));
  });
});

describe('GoogleSheetsStore', () => {
  function setupSheet(rows: Array<Record<string, string>>) {
    const mockRows = rows.map((data) => {
      const rowData = { ...data };
      return {
        get: vi.fn((key: string) => rowData[key]),
        set: vi.fn((key: string, value: string) => { rowData[key] = value; }),
        save: vi.fn(),
      };
    });
    const sheet = {
      getRows: vi.fn().mockResolvedValue(mockRows),
      addRow: mockAddRow.mockResolvedValue({}),
    };
    return { sheet, mockRows };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sheet references
    Object.keys(mockSheetsByTitle).forEach((k) => delete mockSheetsByTitle[k]);
    mockSheetsByIndex.length = 0;
  });

  it('getSubscribers returns active subscribers from named sheet', async () => {
    const { sheet } = setupSheet([
      { email: 'alice@test.com', name: 'Alice' },
      { email: 'bob@test.com', name: '', active: 'false' },
      { email: 'charlie@test.com', name: 'Charlie' },
    ]);
    mockSheetsByTitle['my-app'] = sheet;

    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    const subs = await store.getSubscribers('my-app');

    expect(subs).toEqual([
      { email: 'alice@test.com', name: 'Alice' },
      { email: 'charlie@test.com', name: 'Charlie' },
    ]);
  });

  it('getSubscribers falls back to first sheet', async () => {
    const { sheet } = setupSheet([
      { email: 'user@test.com', name: 'User' },
    ]);
    mockSheetsByIndex[0] = sheet;

    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    const subs = await store.getSubscribers('unknown-product');

    expect(subs).toHaveLength(1);
    expect(subs[0].email).toBe('user@test.com');
  });

  it('getSubscribers returns empty array when no sheet exists', async () => {
    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    const subs = await store.getSubscribers('missing');
    expect(subs).toEqual([]);
  });

  it('getSubscribers skips rows without email', async () => {
    const { sheet } = setupSheet([
      { email: '', name: 'NoEmail' },
      { email: 'valid@test.com', name: 'Valid' },
    ]);
    mockSheetsByTitle['my-app'] = sheet;

    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    const subs = await store.getSubscribers('my-app');

    expect(subs).toHaveLength(1);
    expect(subs[0].email).toBe('valid@test.com');
  });

  it('recordEmailSent is a no-op', async () => {
    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    await expect(store.recordEmailSent('a@b.com', 'prod', '2026-01-01')).resolves.toBeUndefined();
  });

  it('addSubscriber adds a row to the sheet', async () => {
    const { sheet } = setupSheet([]);
    mockSheetsByTitle['my-app'] = sheet;

    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    await store.addSubscriber('my-app', 'new@test.com', 'New User');

    expect(mockAddRow).toHaveBeenCalledWith({ email: 'new@test.com', name: 'New User', active: 'true' });
  });

  it('addSubscriber throws when no sheet found', async () => {
    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    await expect(store.addSubscriber('missing', 'a@b.com')).rejects.toThrow('No sheet found');
  });

  it('removeSubscriber sets active to false', async () => {
    const { sheet, mockRows } = setupSheet([
      { email: 'alice@test.com', name: 'Alice' },
      { email: 'bob@test.com', name: 'Bob' },
    ]);
    mockSheetsByTitle['my-app'] = sheet;

    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    await store.removeSubscriber('my-app', 'bob@test.com');

    expect(mockRows[1].set).toHaveBeenCalledWith('active', 'false');
    expect(mockRows[1].save).toHaveBeenCalled();
    expect(mockRows[0].set).not.toHaveBeenCalled();
  });

  it('removeSubscriber throws when no sheet found', async () => {
    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    await expect(store.removeSubscriber('missing', 'a@b.com')).rejects.toThrow('No sheet found');
  });

  it('removeSubscriber is no-op when email not found', async () => {
    const { sheet, mockRows } = setupSheet([
      { email: 'other@test.com', name: 'Other' },
    ]);
    mockSheetsByTitle['my-app'] = sheet;

    const store = new GoogleSheetsStore('sheet-id', 'sa@example.com', 'key');
    await store.removeSubscriber('my-app', 'nonexistent@test.com');

    expect(mockRows[0].save).not.toHaveBeenCalled();
  });
});

describe('createSubscriberStore gist', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('creates GistStore when SUBSCRIBER_STORE=gist', () => {
    process.env.SUBSCRIBER_STORE = 'gist';
    process.env.GITHUB_GIST_ID = 'abc123';
    process.env.GITHUB_TOKEN = 'ghp_test';
    const store = createSubscriberStore();
    expect(store).toBeInstanceOf(GistStore);
  });

  it('throws when GITHUB_GIST_ID is missing for gist', () => {
    process.env.SUBSCRIBER_STORE = 'gist';
    delete process.env.GITHUB_GIST_ID;
    process.env.GITHUB_TOKEN = 'ghp_test';
    expect(() => createSubscriberStore()).toThrow('Missing GITHUB_GIST_ID');
  });

  it('throws when GITHUB_TOKEN is missing for gist', () => {
    process.env.SUBSCRIBER_STORE = 'gist';
    process.env.GITHUB_GIST_ID = 'abc123';
    delete process.env.GITHUB_TOKEN;
    expect(() => createSubscriberStore()).toThrow('Missing GITHUB_TOKEN');
  });
});

describe('GistStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGistUpdate.mockResolvedValue({});
  });

  function mockGistFiles(files: Record<string, string>) {
    mockGistGet.mockResolvedValue({
      data: {
        files: Object.fromEntries(
          Object.entries(files).map(([name, content]) => [name, { content }]),
        ),
      },
    });
  }

  it('getSubscribers returns matching subscribers from gist', async () => {
    mockGistFiles({
      'subscribers.json': JSON.stringify([
        { email: 'alice@test.com', name: 'Alice', productIds: ['my-app'] },
        { email: 'bob@test.com', productIds: ['other'] },
      ]),
    });

    const store = new GistStore('gist123', 'token');
    const subs = await store.getSubscribers('my-app');

    expect(subs).toEqual([{ email: 'alice@test.com', name: 'Alice' }]);
    expect(mockGistGet).toHaveBeenCalledWith({ gist_id: 'gist123' });
  });

  it('getSubscribers returns empty array when gist file missing', async () => {
    mockGistGet.mockResolvedValue({ data: { files: {} } });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = new GistStore('gist123', 'token');
    const subs = await store.getSubscribers('my-app');

    expect(subs).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('addSubscriber creates new entry in gist', async () => {
    mockGistFiles({ 'subscribers.json': '[]' });

    const store = new GistStore('gist123', 'token');
    await store.addSubscriber('my-app', 'alice@test.com', 'Alice');

    expect(mockGistUpdate).toHaveBeenCalledWith({
      gist_id: 'gist123',
      files: {
        'subscribers.json': {
          content: expect.stringContaining('"alice@test.com"'),
        },
      },
    });
  });

  it('addSubscriber appends productId to existing subscriber', async () => {
    mockGistFiles({
      'subscribers.json': JSON.stringify([
        { email: 'alice@test.com', name: 'Alice', productIds: ['app-a'] },
      ]),
    });

    const store = new GistStore('gist123', 'token');
    await store.addSubscriber('app-b', 'alice@test.com');

    const written = JSON.parse(mockGistUpdate.mock.calls[0][0].files['subscribers.json'].content);
    expect(written[0].productIds).toEqual(['app-a', 'app-b']);
  });

  it('addSubscriber creates file when gist has no subscribers.json', async () => {
    mockGistGet.mockResolvedValue({ data: { files: {} } });

    const store = new GistStore('gist123', 'token');
    await store.addSubscriber('my-app', 'alice@test.com');

    const written = JSON.parse(mockGistUpdate.mock.calls[0][0].files['subscribers.json'].content);
    expect(written).toHaveLength(1);
    expect(written[0].email).toBe('alice@test.com');
  });

  it('removeSubscriber removes productId from subscriber', async () => {
    mockGistFiles({
      'subscribers.json': JSON.stringify([
        { email: 'alice@test.com', productIds: ['app-a', 'app-b'] },
      ]),
    });

    const store = new GistStore('gist123', 'token');
    await store.removeSubscriber('app-a', 'alice@test.com');

    const written = JSON.parse(mockGistUpdate.mock.calls[0][0].files['subscribers.json'].content);
    expect(written[0].productIds).toEqual(['app-b']);
  });

  it('removeSubscriber removes entry when no productIds left', async () => {
    mockGistFiles({
      'subscribers.json': JSON.stringify([
        { email: 'alice@test.com', productIds: ['my-app'] },
      ]),
    });

    const store = new GistStore('gist123', 'token');
    await store.removeSubscriber('my-app', 'alice@test.com');

    const written = JSON.parse(mockGistUpdate.mock.calls[0][0].files['subscribers.json'].content);
    expect(written).toEqual([]);
  });

  it('removeSubscriber is no-op when gist file missing', async () => {
    mockGistGet.mockResolvedValue({ data: { files: {} } });

    const store = new GistStore('gist123', 'token');
    await store.removeSubscriber('my-app', 'alice@test.com');

    expect(mockGistUpdate).not.toHaveBeenCalled();
  });

  it('recordEmailSent appends to email log in gist', async () => {
    mockGistFiles({ 'email-log.json': '[]' });

    const store = new GistStore('gist123', 'token');
    await store.recordEmailSent('alice@test.com', 'my-app', '2024-01-15');

    const written = JSON.parse(mockGistUpdate.mock.calls[0][0].files['email-log.json'].content);
    expect(written).toHaveLength(1);
    expect(written[0].email).toBe('alice@test.com');
    expect(written[0].productId).toBe('my-app');
  });

  it('recordEmailSent creates log file when missing', async () => {
    mockGistGet.mockResolvedValue({ data: { files: {} } });

    const store = new GistStore('gist123', 'token');
    await store.recordEmailSent('alice@test.com', 'my-app', '2024-01-15');

    expect(mockGistUpdate).toHaveBeenCalled();
    const written = JSON.parse(mockGistUpdate.mock.calls[0][0].files['email-log.json'].content);
    expect(written).toHaveLength(1);
  });
});
