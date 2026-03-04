import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

export interface Subscriber {
  email: string;
  name?: string;
}

export interface SubscriberStore {
  getSubscribers(productId: string): Promise<Subscriber[]>;
  recordEmailSent(email: string, productId: string, weekOf: string): Promise<void>;
  addSubscriber(productId: string, email: string, name?: string): Promise<void>;
  removeSubscriber(productId: string, email: string): Promise<void>;
}

// --- SupabaseStore ---

export class SupabaseStore implements SubscriberStore {
  private db;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey);
  }

  async getSubscribers(productId: string): Promise<Subscriber[]> {
    const { data, error } = await this.db
      .from('beta_testers')
      .select('email, name')
      .eq('product', productId)
      .is('unsubscribed_at', null);

    if (error) throw error;

    const subscribers = (data ?? []) as Subscriber[];

    if (subscribers.length === 0) {
      console.warn(`[subscribers] No active subscribers found for product: ${productId}`);
    }

    return subscribers;
  }

  async recordEmailSent(email: string, productId: string, weekOf: string): Promise<void> {
    const { error } = await this.db.from('email_log').insert({
      tester_id: email,
      product_id: productId,
      week_of: weekOf,
      sent_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async addSubscriber(productId: string, email: string, name?: string): Promise<void> {
    const { error } = await this.db.from('beta_testers').insert({
      email,
      name: name ?? null,
      product: productId,
    });
    if (error) throw error;
  }

  async removeSubscriber(productId: string, email: string): Promise<void> {
    const { error } = await this.db
      .from('beta_testers')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('email', email)
      .eq('product', productId);
    if (error) throw error;
  }
}

// --- JsonFileStore ---

interface JsonSubscriberEntry {
  email: string;
  name?: string;
  productIds: string[];
}

interface JsonEmailLogEntry {
  email: string;
  productId: string;
  weekOf: string;
  sentAt: string;
}

export class JsonFileStore implements SubscriberStore {
  private subscribersPath: string;
  private emailLogPath: string;

  constructor(subscribersPath?: string, emailLogPath?: string) {
    this.subscribersPath = subscribersPath || './subscribers.json';
    this.emailLogPath = emailLogPath || './email-log.json';
  }

  async getSubscribers(productId: string): Promise<Subscriber[]> {
    if (!existsSync(this.subscribersPath)) {
      console.warn(`[subscribers] File not found: ${this.subscribersPath}`);
      return [];
    }

    const raw = readFileSync(this.subscribersPath, 'utf-8');
    const entries: JsonSubscriberEntry[] = JSON.parse(raw);

    const subscribers = entries
      .filter((e) => e.productIds.includes(productId))
      .map((e) => ({ email: e.email, name: e.name }));

    if (subscribers.length === 0) {
      console.warn(`[subscribers] No active subscribers found for product: ${productId}`);
    }

    return subscribers;
  }

  async recordEmailSent(email: string, productId: string, weekOf: string): Promise<void> {
    let log: JsonEmailLogEntry[] = [];
    if (existsSync(this.emailLogPath)) {
      const raw = readFileSync(this.emailLogPath, 'utf-8');
      log = JSON.parse(raw);
    }

    log.push({ email, productId, weekOf, sentAt: new Date().toISOString() });
    writeFileSync(this.emailLogPath, JSON.stringify(log, null, 2) + '\n');
  }

  async addSubscriber(productId: string, email: string, name?: string): Promise<void> {
    let entries: JsonSubscriberEntry[] = [];
    if (existsSync(this.subscribersPath)) {
      entries = JSON.parse(readFileSync(this.subscribersPath, 'utf-8'));
    }

    const existing = entries.find((e) => e.email === email);
    if (existing) {
      if (!existing.productIds.includes(productId)) {
        existing.productIds.push(productId);
      }
      if (name) existing.name = name;
    } else {
      entries.push({ email, name, productIds: [productId] });
    }

    writeFileSync(this.subscribersPath, JSON.stringify(entries, null, 2) + '\n');
  }

  async removeSubscriber(productId: string, email: string): Promise<void> {
    if (!existsSync(this.subscribersPath)) return;

    let entries: JsonSubscriberEntry[] = JSON.parse(readFileSync(this.subscribersPath, 'utf-8'));
    const existing = entries.find((e) => e.email === email);
    if (!existing) return;

    existing.productIds = existing.productIds.filter((id) => id !== productId);
    if (existing.productIds.length === 0) {
      entries = entries.filter((e) => e.email !== email);
    }

    writeFileSync(this.subscribersPath, JSON.stringify(entries, null, 2) + '\n');
  }
}

// --- GoogleSheetsStore ---

export class GoogleSheetsStore implements SubscriberStore {
  private spreadsheetId: string;
  private serviceAccountEmail: string;
  private privateKey: string;

  constructor(spreadsheetId: string, serviceAccountEmail: string, privateKey: string) {
    this.spreadsheetId = spreadsheetId;
    this.serviceAccountEmail = serviceAccountEmail;
    this.privateKey = privateKey;
  }

  private async getDoc() {
    const { GoogleSpreadsheet } = await import('google-spreadsheet');
    const { JWT } = await import('google-auth-library');

    const auth = new JWT({
      email: this.serviceAccountEmail,
      key: this.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(this.spreadsheetId, auth);
    await doc.loadInfo();
    return doc;
  }

  async getSubscribers(productId: string): Promise<Subscriber[]> {
    const doc = await this.getDoc();

    // Look for a sheet named after the productId, fall back to first sheet
    const sheet = doc.sheetsByTitle[productId] ?? doc.sheetsByIndex[0];
    if (!sheet) {
      console.warn(`[subscribers] No sheet found for product: ${productId}`);
      return [];
    }

    const rows = await sheet.getRows();
    const subscribers: Subscriber[] = [];

    for (const row of rows) {
      const email = row.get('email');
      if (!email) continue;

      const active = row.get('active');
      if (active && active.toLowerCase() === 'false') continue;

      subscribers.push({ email, name: row.get('name') || undefined });
    }

    if (subscribers.length === 0) {
      console.warn(`[subscribers] No active subscribers found for product: ${productId}`);
    }

    return subscribers;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async recordEmailSent(_email: string, _productId: string, _weekOf: string): Promise<void> {
    // No-op for Google Sheets store
  }

  async addSubscriber(productId: string, email: string, name?: string): Promise<void> {
    const doc = await this.getDoc();
    const sheet = doc.sheetsByTitle[productId] ?? doc.sheetsByIndex[0];
    if (!sheet) {
      throw new Error(`No sheet found for product: ${productId}`);
    }
    await sheet.addRow({ email, name: name ?? '', active: 'true' });
  }

  async removeSubscriber(productId: string, email: string): Promise<void> {
    const doc = await this.getDoc();
    const sheet = doc.sheetsByTitle[productId] ?? doc.sheetsByIndex[0];
    if (!sheet) {
      throw new Error(`No sheet found for product: ${productId}`);
    }

    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('email') === email) {
        row.set('active', 'false');
        await row.save();
        return;
      }
    }
  }
}

// --- Factory ---

export type SubscriberStoreType = 'supabase' | 'json' | 'google-sheets';

export function createSubscriberStore(overrides?: {
  store?: SubscriberStoreType;
}): SubscriberStore {
  const storeType = (overrides?.store || process.env.SUBSCRIBER_STORE || 'supabase') as SubscriberStoreType;

  switch (storeType) {
    case 'supabase': {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY;
      if (!url) throw new Error('Missing SUPABASE_URL environment variable');
      if (!key) throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
      return new SupabaseStore(url, key);
    }
    case 'json': {
      const subscribersPath = process.env.SUBSCRIBERS_JSON_PATH || undefined;
      const emailLogPath = process.env.EMAIL_LOG_JSON_PATH || undefined;
      return new JsonFileStore(subscribersPath, emailLogPath);
    }
    case 'google-sheets': {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY;
      if (!spreadsheetId) throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
      if (!email) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable');
      if (!privateKey) throw new Error('Missing GOOGLE_PRIVATE_KEY environment variable');
      return new GoogleSheetsStore(spreadsheetId, email, privateKey);
    }
    default:
      throw new Error(`Unknown subscriber store: ${storeType}. Supported: supabase, json, google-sheets`);
  }
}
