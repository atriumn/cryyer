import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock external modules before importing
vi.mock('../config.js', () => ({ loadProducts: vi.fn() }));
vi.mock('../subscriber-store.js', () => ({ createSubscriberStore: vi.fn() }));
vi.mock('../send.js', () => ({ sendEmails: vi.fn() }));
vi.mock('octokit', () => ({ Octokit: vi.fn(function OctokitMock() {}) }));
vi.mock('resend', () => ({ Resend: vi.fn(function ResendMock() {}) }));

import { parseIssueBody, isDryRun, main } from '../send-on-close.js';
import { loadProducts } from '../config.js';
import { createSubscriberStore } from '../subscriber-store.js';
import { sendEmails } from '../send.js';
import { Octokit } from 'octokit';

describe('parseIssueBody', () => {
  it('parses a well-formed issue body', () => {
    const body = '**Subject:** Weekly Update for Jan 20\n\n---\n\nHello beta testers!\n\nHere are this week\'s changes.';
    const result = parseIssueBody(body);
    expect(result).toEqual({
      subject: 'Weekly Update for Jan 20',
      emailBody: 'Hello beta testers!\n\nHere are this week\'s changes.',
    });
  });

  it('returns null when subject line is missing', () => {
    const body = 'No subject here\n\n---\n\nSome body text';
    expect(parseIssueBody(body)).toBeNull();
  });

  it('returns null when separator is missing', () => {
    const body = '**Subject:** Weekly Update\n\nNo separator here';
    expect(parseIssueBody(body)).toBeNull();
  });

  it('handles multiline email body with markdown', () => {
    const body = '**Subject:** Release Notes\n\n---\n\n## What\'s New\n\n- Feature A\n- Feature B\n\nThanks for testing!';
    const result = parseIssueBody(body);
    expect(result).not.toBeNull();
    expect(result!.subject).toBe('Release Notes');
    expect(result!.emailBody).toContain('## What\'s New');
    expect(result!.emailBody).toContain('- Feature A');
    expect(result!.emailBody).toContain('Thanks for testing!');
  });

  it('trims whitespace from subject and body', () => {
    const body = '**Subject:**   Spaced Subject  \n\n---\n\n  Spaced body  ';
    const result = parseIssueBody(body);
    expect(result).toEqual({
      subject: 'Spaced Subject',
      emailBody: 'Spaced body',
    });
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
});

describe('main dry-run mode', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['ISSUE_NUMBER'] = '42';
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';
    process.env['DRY_RUN'] = 'true';
    // RESEND_API_KEY and FROM_EMAIL intentionally absent in dry-run
    delete process.env['RESEND_API_KEY'];
    delete process.env['FROM_EMAIL'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prints preview and skips sending when DRY_RUN=true', async () => {
    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: 'friendly',
      repo: 'owner/test-app',
      emailSubjectTemplate: 'Weekly update',
    };
    const issueBody = '**Subject:** Test Subject\n\n---\n\nTest email body content';

    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: issueBody,
              labels: [{ name: 'draft' }, { name: 'test-app' }],
            },
          }),
          createComment: vi.fn(),
          addLabels: vi.fn(),
          update: vi.fn(),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([mockProduct]);

    const mockStore = { getSubscribers: vi.fn().mockResolvedValue([{ email: 'user@example.com' }]) };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main();

    expect(sendEmails).not.toHaveBeenCalled();

    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('[DRY RUN]');
    expect(output).toContain('Test Subject');

    consoleSpy.mockRestore();
  });

  it('does not require RESEND_API_KEY in dry-run mode', async () => {
    delete process.env['RESEND_API_KEY'];
    delete process.env['FROM_EMAIL'];

    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** S\n\n---\n\nB',
              labels: [{ name: 'draft' }, { name: 'my-product' }],
            },
          }),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-product', name: 'My Product', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);
    (createSubscriberStore as Mock).mockReturnValue({
      getSubscribers: vi.fn().mockResolvedValue([{ email: 'u@e.com' }]),
    });

    await expect(main()).resolves.toBeUndefined();
    expect(sendEmails).not.toHaveBeenCalled();
  });
});

describe('audience detection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['ISSUE_NUMBER'] = '42';
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';
    process.env['FROM_EMAIL'] = 'from@example.com';
    process.env['RESEND_API_KEY'] = 'test-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses compound subscriber key when audience label is present', async () => {
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** Beta Update\n\n---\n\nBeta content',
              labels: [{ name: 'draft' }, { name: 'my-app' }, { name: 'audience:beta' }],
            },
          }),
          getLabel: vi.fn().mockResolvedValue({}),
          addLabels: vi.fn().mockResolvedValue({}),
          createComment: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-app', name: 'My App', repo: 'o/r', audiences: [
        { id: 'beta', voice: 'casual', emailSubjectTemplate: 'Beta' },
      ] },
    ]);

    const mockStore = {
      getSubscribers: vi.fn().mockResolvedValue([{ email: 'beta@example.com' }]),
    };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);
    (sendEmails as Mock).mockResolvedValue({ sent: 1, failed: 0, failures: [] });

    await main();

    // Subscribers fetched with compound key
    expect(mockStore.getSubscribers).toHaveBeenCalledWith('my-app:beta');
    expect(sendEmails).toHaveBeenCalledTimes(1);
  });

  it('sends emails and posts stats comment when issue has subscribers', async () => {
    delete process.env['DRY_RUN'];
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** Weekly Update\n\n---\n\nHello testers!',
              labels: [{ name: 'draft' }, { name: 'my-app' }],
            },
          }),
          getLabel: vi.fn().mockResolvedValue({}),
          addLabels: vi.fn().mockResolvedValue({}),
          createComment: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-app', name: 'My App', voice: 'friendly', repo: 'o/r', emailSubjectTemplate: 'Update' },
    ]);

    const mockStore = {
      getSubscribers: vi.fn().mockResolvedValue([{ email: 'user@example.com' }]),
    };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);
    (sendEmails as Mock).mockResolvedValue({ sent: 1, failed: 0, failures: [] });

    await main();

    // Emails sent
    expect(sendEmails).toHaveBeenCalledTimes(1);
    expect(sendEmails).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'my-app' }),
      [{ email: 'user@example.com' }],
      { subject: 'Weekly Update', body: 'Hello testers!' },
      expect.any(String),
      'from@example.com',
    );

    // Sent label added
    expect(mockOctokitInstance.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['sent'] })
    );

    // Stats comment posted
    expect(mockOctokitInstance.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('1'),
      })
    );
  });

  it('reopens issue and posts error comment when send fails', async () => {
    delete process.env['DRY_RUN'];
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** Update\n\n---\n\nContent',
              labels: [{ name: 'draft' }, { name: 'my-app' }],
            },
          }),
          getLabel: vi.fn().mockResolvedValue({}),
          addLabels: vi.fn().mockResolvedValue({}),
          createComment: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-app', name: 'My App', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);
    (createSubscriberStore as Mock).mockReturnValue({
      getSubscribers: vi.fn().mockResolvedValue([{ email: 'u@e.com' }]),
    });
    (sendEmails as Mock).mockRejectedValue(new Error('SMTP error'));

    await main();

    // Issue reopened
    expect(mockOctokitInstance.rest.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'open' })
    );

    // Error comment posted
    expect(mockOctokitInstance.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('SMTP error'),
      })
    );
  });

  it('uses plain product id when no audience label is present', async () => {
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** Update\n\n---\n\nContent',
              labels: [{ name: 'draft' }, { name: 'my-app' }],
            },
          }),
          getLabel: vi.fn().mockResolvedValue({}),
          addLabels: vi.fn().mockResolvedValue({}),
          createComment: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-app', name: 'My App', voice: 'friendly', repo: 'o/r', emailSubjectTemplate: 'Update' },
    ]);

    const mockStore = {
      getSubscribers: vi.fn().mockResolvedValue([{ email: 'user@example.com' }]),
    };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);
    (sendEmails as Mock).mockResolvedValue({ sent: 1, failed: 0, failures: [] });

    await main();

    expect(mockStore.getSubscribers).toHaveBeenCalledWith('my-app');
  });

  it('skips when issue does not have draft label', async () => {
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** Update\n\n---\n\nContent',
              labels: [{ name: 'bug' }],
            },
          }),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main();
    expect(sendEmails).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('skips when no matching product label found', async () => {
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** Update\n\n---\n\nContent',
              labels: [{ name: 'draft' }, { name: 'unknown-product' }],
            },
          }),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-app', name: 'My App', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);

    await main();
    expect(sendEmails).not.toHaveBeenCalled();
  });

  it('posts comment when issue body cannot be parsed', async () => {
    const mockCreateComment = vi.fn().mockResolvedValue({});
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: 'Not a valid draft format',
              labels: [{ name: 'draft' }, { name: 'my-app' }],
            },
          }),
          createComment: mockCreateComment,
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-app', name: 'My App', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);

    await main();
    expect(sendEmails).not.toHaveBeenCalled();
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Could not parse'),
      })
    );
  });

  it('posts comment and adds sent label when no subscribers found', async () => {
    const mockCreateComment = vi.fn().mockResolvedValue({});
    const mockAddLabels = vi.fn().mockResolvedValue({});
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** Update\n\n---\n\nContent',
              labels: [{ name: 'draft' }, { name: 'my-app' }],
            },
          }),
          createComment: mockCreateComment,
          addLabels: mockAddLabels,
          getLabel: vi.fn().mockResolvedValue({}),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-app', name: 'My App', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);
    (createSubscriberStore as Mock).mockReturnValue({
      getSubscribers: vi.fn().mockResolvedValue([]),
    });

    await main();
    expect(sendEmails).not.toHaveBeenCalled();
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('No active subscribers'),
      })
    );
    expect(mockAddLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['sent'] })
    );
  });

  it('reopens issue when send has partial failures', async () => {
    delete process.env['DRY_RUN'];
    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockOctokitInstance = {
      rest: {
        issues: {
          get: vi.fn().mockResolvedValue({
            data: {
              body: '**Subject:** Update\n\n---\n\nContent',
              labels: [{ name: 'draft' }, { name: 'my-app' }],
            },
          }),
          getLabel: vi.fn().mockResolvedValue({}),
          addLabels: vi.fn().mockResolvedValue({}),
          createComment: vi.fn().mockResolvedValue({}),
          update: mockUpdate,
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (loadProducts as Mock).mockReturnValue([
      { id: 'my-app', name: 'My App', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);
    (createSubscriberStore as Mock).mockReturnValue({
      getSubscribers: vi.fn().mockResolvedValue([{ email: 'a@b.com' }, { email: 'c@d.com' }]),
    });
    (sendEmails as Mock).mockResolvedValue({
      sent: 1,
      failed: 1,
      failures: [{ email: 'c@d.com', error: 'bounce' }],
    });

    const origExitCode = process.exitCode;
    await main();

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'open' })
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = origExitCode;
  });
});
