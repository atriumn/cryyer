import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createSubscriberStore, SupabaseStore, JsonFileStore, GoogleSheetsStore } from '../subscriber-store.js';

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
  const tmpPath = join(tmpdir(), `cryer-test-subscribers-${Date.now()}.json`);

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
  const tmpPath = join(tmpdir(), `cryer-test-subscribers-rm-${Date.now()}.json`);

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
