import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock external modules before importing
vi.mock('../config.js', () => ({ loadProducts: vi.fn() }));
vi.mock('../subscriber-store.js', () => ({ createSubscriberStore: vi.fn() }));
vi.mock('../send.js', () => ({ sendWeeklyEmails: vi.fn() }));
vi.mock('octokit', () => ({ Octokit: vi.fn(function OctokitMock() {}) }));
vi.mock('resend', () => ({ Resend: vi.fn(function ResendMock() {}) }));

import { parseIssueBody, isDryRun, main } from '../send-on-close.js';
import { loadProducts } from '../config.js';
import { createSubscriberStore } from '../subscriber-store.js';
import { sendWeeklyEmails } from '../send.js';
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

    expect(sendWeeklyEmails).not.toHaveBeenCalled();

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
    expect(sendWeeklyEmails).not.toHaveBeenCalled();
  });
});
