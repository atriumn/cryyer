import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock all external modules before importing
vi.mock('../config.js', () => ({
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

import { getWeekOf, isDryRun, main } from '../index.js';
import { loadProducts } from '../config.js';
import { gatherWeeklyActivity } from '../gather.js';
import { generateEmailDraft } from '../summarize.js';
import { sendWeeklyEmails } from '../send.js';
import { createLLMProvider } from '../llm-provider.js';
import { createSubscriberStore } from '../subscriber-store.js';

describe('getWeekOf', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
    // Pin to a specific Wednesday to avoid timezone/week-boundary flakiness
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T12:00:00Z')); // Wednesday, March 4, 2026
    const result = getWeekOf();
    expect(result).toBe('2026-03-02'); // Monday of that week
  });

  it('returns the correct Monday when today is Sunday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00Z')); // Sunday, March 8, 2026
    const result = getWeekOf();
    expect(result).toBe('2026-03-02'); // Monday of that week (not next Monday)
  });
});

describe('main orchestration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['RESEND_API_KEY'] = 'resend-key';
    process.env['FROM_EMAIL'] = 'from@example.com';
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    delete process.env['DRY_RUN'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sends emails to subscribers for each product', async () => {
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
      'from@example.com',
      undefined
    );
    expect(mockStore.recordEmailSent).toHaveBeenCalledWith(
      'user@example.com',
      'test-app',
      expect.any(String)
    );
  });

  it('skips sending if no subscribers', async () => {
    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: '',
      repo: 'owner/test-app',
      emailSubjectTemplate: '',
    };

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

describe('isDryRun', () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];

  afterEach(() => {
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  it('returns false by default', () => {
    delete process.env['DRY_RUN'];
    process.argv = process.argv.filter((a) => a !== '--dry-run');
    expect(isDryRun()).toBe(false);
  });

  it('returns true when DRY_RUN=true', () => {
    process.env['DRY_RUN'] = 'true';
    expect(isDryRun()).toBe(true);
  });

  it('returns true when --dry-run flag is passed', () => {
    delete process.env['DRY_RUN'];
    process.argv = [...process.argv, '--dry-run'];
    expect(isDryRun()).toBe(true);
  });
});

describe('dry-run mode', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    process.env['DRY_RUN'] = 'true';
    // RESEND_API_KEY and FROM_EMAIL intentionally unset to verify they're not required
    delete process.env['RESEND_API_KEY'];
    delete process.env['FROM_EMAIL'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prints draft to stdout and skips email sending when DRY_RUN=true', async () => {
    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: 'friendly',
      repo: 'owner/test-app',
      emailSubjectTemplate: 'Weekly update {{weekOf}}',
    };
    const mockSubscribers = [{ email: 'user@example.com' }];
    const mockDraft = { subject: 'Dry Run Subject', body: 'Dry run body content' };

    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherWeeklyActivity as Mock).mockResolvedValue({ prs: [], releases: [], commits: [] });
    (generateEmailDraft as Mock).mockResolvedValue(mockDraft);

    const mockStore = {
      getSubscribers: vi.fn().mockResolvedValue(mockSubscribers),
      recordEmailSent: vi.fn(),
    };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);
    (createLLMProvider as Mock).mockReturnValue({});

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main();

    // Emails should NOT have been sent
    expect(sendWeeklyEmails).not.toHaveBeenCalled();
    expect(mockStore.recordEmailSent).not.toHaveBeenCalled();

    // Output should contain preview
    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('[DRY RUN]');
    expect(output).toContain('Dry Run Subject');

    consoleSpy.mockRestore();
  });

  it('does not require RESEND_API_KEY or FROM_EMAIL in dry-run mode', async () => {
    delete process.env['RESEND_API_KEY'];
    delete process.env['FROM_EMAIL'];

    (loadProducts as Mock).mockReturnValue([]);
    (createSubscriberStore as Mock).mockReturnValue({ getSubscribers: vi.fn() });
    (createLLMProvider as Mock).mockReturnValue({});

    await expect(main()).resolves.toBeUndefined();
  });
});
