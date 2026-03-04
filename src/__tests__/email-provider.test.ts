import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('resend', () => ({
  Resend: class MockResend {
    batch = { send: mockSend };
  },
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class MockOAuth2Client {
    setCredentials() {}
    async getAccessToken() { return { token: 'mock-access-token' }; }
  },
}));

import { ResendProvider, GmailProvider, createEmailProvider } from '../email-provider.js';
import type { EmailMessage } from '../email-provider.js';

describe('ResendProvider', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to Resend batch.send and returns stats', async () => {
    mockSend.mockResolvedValue({ error: null });

    const provider = new ResendProvider('re_test_key');
    const emails: EmailMessage[] = [
      { from: 'sender@test.com', to: 'a@test.com', subject: 'Test', html: '<p>Hi</p>' },
      { from: 'sender@test.com', to: 'b@test.com', subject: 'Test', html: '<p>Hi</p>' },
    ];

    const result = await provider.sendBatch(emails);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it('records failures when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ error: { message: 'API error' } });

    const provider = new ResendProvider('re_test_key');
    const emails: EmailMessage[] = [
      { from: 'sender@test.com', to: 'a@test.com', subject: 'Test', html: '<p>Hi</p>' },
    ];

    const result = await provider.sendBatch(emails);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.failures[0].email).toBe('a@test.com');
    expect(result.failures[0].error).toBe('API error');
  });

  it('handles thrown exceptions', async () => {
    mockSend.mockRejectedValue(new Error('Network error'));

    const provider = new ResendProvider('re_test_key');
    const emails: EmailMessage[] = [
      { from: 'sender@test.com', to: 'a@test.com', subject: 'Test', html: '<p>Hi</p>' },
    ];

    const result = await provider.sendBatch(emails);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.failures[0].error).toContain('Network error');
  });
});

describe('createEmailProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults to resend provider', () => {
    process.env.RESEND_API_KEY = 're_test';
    const provider = createEmailProvider();
    expect(provider).toBeInstanceOf(ResendProvider);
  });

  it('creates gmail provider when EMAIL_PROVIDER=gmail', () => {
    process.env.EMAIL_PROVIDER = 'gmail';
    process.env.GMAIL_REFRESH_TOKEN = 'test_refresh_token';
    const provider = createEmailProvider();
    expect(provider).toBeInstanceOf(GmailProvider);
  });

  it('throws when resend key is missing', () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_PROVIDER;
    expect(() => createEmailProvider()).toThrow('Missing RESEND_API_KEY');
  });

  it('throws when gmail refresh token is missing', () => {
    process.env.EMAIL_PROVIDER = 'gmail';
    delete process.env.GMAIL_REFRESH_TOKEN;
    expect(() => createEmailProvider()).toThrow('Missing GMAIL_REFRESH_TOKEN');
  });

  it('throws on unknown provider', () => {
    process.env.EMAIL_PROVIDER = 'sendgrid';
    expect(() => createEmailProvider()).toThrow('Unknown email provider');
  });

  it('accepts override provider', () => {
    process.env.GMAIL_REFRESH_TOKEN = 'test_token';
    const provider = createEmailProvider({ provider: 'gmail' });
    expect(provider).toBeInstanceOf(GmailProvider);
  });
});

describe('GmailProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends emails via Gmail API and returns stats', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'msg-1' }), { status: 200 })
    );

    const provider = new GmailProvider('mock-refresh-token');
    const emails: EmailMessage[] = [
      { from: 'sender@test.com', to: 'a@test.com', subject: 'Test', html: '<p>Hi</p>' },
    ];

    const result = await provider.sendBatch(emails);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer mock-access-token' }),
      })
    );
  });

  it('records failures when Gmail API returns error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 })
    );

    const provider = new GmailProvider('mock-refresh-token');
    const emails: EmailMessage[] = [
      { from: 'sender@test.com', to: 'a@test.com', subject: 'Test', html: '<p>Hi</p>' },
    ];

    const result = await provider.sendBatch(emails);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.failures[0].error).toContain('400');
  });

  it('records failures when fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network down'));

    const provider = new GmailProvider('mock-refresh-token');
    const emails: EmailMessage[] = [
      { from: 'sender@test.com', to: 'a@test.com', subject: 'Test', html: '<p>Hi</p>' },
    ];

    const result = await provider.sendBatch(emails);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.failures[0].error).toContain('Network down');
  });

  it('includes replyTo and custom headers in RFC2822 message', async () => {
    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = JSON.parse((init as RequestInit).body as string).raw;
      return new Response(JSON.stringify({ id: 'msg-1' }), { status: 200 });
    });

    const provider = new GmailProvider('mock-refresh-token');
    await provider.sendBatch([{
      from: 'sender@test.com',
      to: 'a@test.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      replyTo: 'reply@test.com',
      headers: { 'X-Custom': 'value' },
    }]);

    // Decode base64url
    const decoded = Buffer.from(capturedBody.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    expect(decoded).toContain('Reply-To: reply@test.com');
    expect(decoded).toContain('X-Custom: value');
  });
});
