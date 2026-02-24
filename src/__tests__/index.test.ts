import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock all external modules before importing
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(),
  loadProducts: vi.fn(),
}));
vi.mock('../gather.js', () => ({
  gatherWeeklyActivity: vi.fn(),
}));
vi.mock('../summarize.js', () => ({
  generateEmailDraft: vi.fn(),
}));
vi.mock('../send.js', () => ({
  sendWeeklyEmails: vi.fn(),
}));
vi.mock('../llm-provider.js', () => ({
  createLLMProvider: vi.fn(),
}));
vi.mock('../subscriber-store.js', () => ({
  createSubscriberStore: vi.fn(),
}));
vi.mock('octokit', () => ({
  // Use a regular function so it can be called with `new`
  Octokit: vi.fn(function OctokitMock() {}),
}));
vi.mock('resend', () => ({
  // Use a regular function so it can be called with `new`
  Resend: vi.fn(function ResendMock() {}),
}));

import { getWeekOf, main } from '../index.js';
import { loadConfig, loadProducts } from '../config.js';
import { gatherWeeklyActivity } from '../gather.js';
import { generateEmailDraft } from '../summarize.js';
import { sendWeeklyEmails } from '../send.js';
import { createLLMProvider } from '../llm-provider.js';
import { createSubscriberStore } from '../subscriber-store.js';

describe('getWeekOf', () => {
  it('returns a date string in YYYY-MM-DD format', () => {
    const result = getWeekOf();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a Monday', () => {
    const result = getWeekOf();
    const date = new Date(result);
    // 1 = Monday in UTC
    expect(date.getUTCDay()).toBe(1);
  });

  it('returns the start of the current week', () => {
    const result = getWeekOf();
    const resultDate = new Date(result);
    const now = new Date();
    // The result should be within the last 7 days
    const diffMs = now.getTime() - resultDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(0);
    expect(diffDays).toBeLessThan(7);
  });
});

describe('main orchestration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sends emails to subscribers for each product', async () => {
    const mockConfig = {
      githubToken: 'token',
      resendApiKey: 'resend-key',
      fromEmail: 'from@example.com',
    };
    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: 'friendly',
      repo: 'owner/test-app',
      emailSubjectTemplate: 'Weekly update {{weekOf}}',
    };
    const mockSubscribers = [{ email: 'user@example.com' }];
    const mockActivity = { prs: [], releases: [], commits: [] };
    const mockDraft = { subject: 'Test Subject', body: 'Test body' };

    (loadConfig as Mock).mockReturnValue(mockConfig);
    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherWeeklyActivity as Mock).mockResolvedValue(mockActivity);
    (generateEmailDraft as Mock).mockResolvedValue(mockDraft);

    const mockStore = {
      getSubscribers: vi.fn().mockResolvedValue(mockSubscribers),
      recordEmailSent: vi.fn().mockResolvedValue(undefined),
    };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);
    (createLLMProvider as Mock).mockReturnValue({});
    (sendWeeklyEmails as Mock).mockResolvedValue({ sent: 1, failed: 0, failures: [] });

    await main();

    expect(gatherWeeklyActivity).toHaveBeenCalledWith(
      expect.anything(),
      mockProduct,
      expect.any(String)
    );
    expect(generateEmailDraft).toHaveBeenCalledWith(
      {},
      mockProduct,
      mockActivity,
      expect.any(String)
    );
    expect(sendWeeklyEmails).toHaveBeenCalledWith(
      expect.anything(),
      mockProduct,
      mockSubscribers,
      { subject: mockDraft.subject, body: mockDraft.body },
      expect.any(String),
      mockConfig.fromEmail,
      undefined
    );
    expect(mockStore.recordEmailSent).toHaveBeenCalledWith(
      'user@example.com',
      'test-app',
      expect.any(String)
    );
  });

  it('skips sending if no subscribers', async () => {
    const mockConfig = {
      githubToken: 'token',
      resendApiKey: 'resend-key',
      fromEmail: 'from@example.com',
    };
    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: '',
      repo: 'owner/test-app',
      emailSubjectTemplate: '',
    };

    (loadConfig as Mock).mockReturnValue(mockConfig);
    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherWeeklyActivity as Mock).mockResolvedValue({ prs: [], releases: [], commits: [] });
    (generateEmailDraft as Mock).mockResolvedValue({ subject: 'S', body: 'B' });

    const mockStore = {
      getSubscribers: vi.fn().mockResolvedValue([]),
      recordEmailSent: vi.fn(),
    };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);
    (createLLMProvider as Mock).mockReturnValue({});

    await main();

    expect(sendWeeklyEmails).not.toHaveBeenCalled();
    expect(mockStore.recordEmailSent).not.toHaveBeenCalled();
  });

  it('handles errors per product without stopping other products', async () => {
    const mockConfig = {
      githubToken: 'token',
      resendApiKey: 'resend-key',
      fromEmail: 'from@example.com',
    };
    const product1 = {
      id: 'app1',
      name: 'App 1',
      voice: '',
      repo: 'o/r',
      emailSubjectTemplate: '',
    };
    const product2 = {
      id: 'app2',
      name: 'App 2',
      voice: '',
      repo: 'o/r2',
      emailSubjectTemplate: '',
    };

    (loadConfig as Mock).mockReturnValue(mockConfig);
    (loadProducts as Mock).mockReturnValue([product1, product2]);
    (gatherWeeklyActivity as Mock)
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce({ prs: [], releases: [], commits: [] });
    (generateEmailDraft as Mock).mockResolvedValue({ subject: 'S', body: 'B' });

    const mockStore = {
      getSubscribers: vi.fn().mockResolvedValue([{ email: 'u@e.com' }]),
      recordEmailSent: vi.fn().mockResolvedValue(undefined),
    };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);
    (createLLMProvider as Mock).mockReturnValue({});
    (sendWeeklyEmails as Mock).mockResolvedValue({ sent: 1, failed: 0, failures: [] });

    // Should not throw
    await expect(main()).resolves.toBeUndefined();

    // Both products should have been attempted
    expect(gatherWeeklyActivity).toHaveBeenCalledTimes(2);
  });
});
