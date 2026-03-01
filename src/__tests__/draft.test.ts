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
vi.mock('../llm-provider.js', () => ({
  createLLMProvider: vi.fn(),
}));
vi.mock('octokit', () => ({
  // Use a regular function so it can be called with `new`
  Octokit: vi.fn(function OctokitMock() {}),
}));

import { getWeekOf, requireEnv, ensureLabel, isDryRun, main } from '../draft.js';
import { loadProducts } from '../config.js';
import { gatherWeeklyActivity } from '../gather.js';
import { generateEmailDraft } from '../summarize.js';
import { createLLMProvider } from '../llm-provider.js';
import { Octokit } from 'octokit';

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
});

describe('requireEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns the value when environment variable is set', () => {
    process.env['TEST_VAR_DRAFT'] = 'hello';
    expect(requireEnv('TEST_VAR_DRAFT')).toBe('hello');
  });

  it('throws when environment variable is missing', () => {
    delete process.env['TEST_VAR_DRAFT'];
    expect(() => requireEnv('TEST_VAR_DRAFT')).toThrow(
      'Missing required environment variable: TEST_VAR_DRAFT'
    );
  });
});

describe('ensureLabel', () => {
  it('does not call createLabel if label already exists', async () => {
    const mockOctokit = {
      rest: {
        issues: {
          getLabel: vi.fn().mockResolvedValue({}),
          createLabel: vi.fn(),
        },
      },
    };

    await expect(
      ensureLabel(mockOctokit as never, 'owner', 'repo', 'draft', '0075ca')
    ).resolves.toBeUndefined();

    expect(mockOctokit.rest.issues.getLabel).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      name: 'draft',
    });
    expect(mockOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
  });

  it('creates label when it does not exist', async () => {
    const mockOctokit = {
      rest: {
        issues: {
          getLabel: vi.fn().mockRejectedValue(new Error('Not Found')),
          createLabel: vi.fn().mockResolvedValue({}),
        },
      },
    };

    await expect(
      ensureLabel(mockOctokit as never, 'owner', 'repo', 'new-label', 'ff0000')
    ).resolves.toBeUndefined();

    expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      name: 'new-label',
      color: 'ff0000',
    });
  });

  it('ignores error if label creation fails due to race condition', async () => {
    const mockOctokit = {
      rest: {
        issues: {
          getLabel: vi.fn().mockRejectedValue(new Error('Not Found')),
          createLabel: vi.fn().mockRejectedValue(new Error('Already exists')),
        },
      },
    };

    await expect(
      ensureLabel(mockOctokit as never, 'owner', 'repo', 'draft', '0075ca')
    ).resolves.toBeUndefined();
  });
});

describe('main orchestration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_TOKEN'] = 'test-token';
    process.env['CRYYER_REPO'] = 'owner/cryyer';
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('processes products and creates GitHub issues', async () => {
    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: 'friendly',
      repo: 'owner/test-app',
      emailSubjectTemplate: 'Weekly update {{weekOf}}',
    };

    const mockActivity = { prs: [], releases: [], commits: [] };
    const mockDraft = { subject: 'Test Subject', body: 'Test body' };
    const mockIssue = { html_url: 'https://github.com/owner/cryyer/issues/1' };

    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherWeeklyActivity as Mock).mockResolvedValue(mockActivity);
    (generateEmailDraft as Mock).mockResolvedValue(mockDraft);

    const mockOctokitInstance = {
      rest: {
        issues: {
          getLabel: vi.fn().mockResolvedValue({}),
          createLabel: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({ data: mockIssue }),
        },
      },
    };
    // Use a regular function (not arrow) so it can be called with `new`
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (createLLMProvider as Mock).mockReturnValue({});

    await main();

    expect(gatherWeeklyActivity).toHaveBeenCalledWith(
      mockOctokitInstance,
      mockProduct,
      expect.any(String)
    );
    expect(generateEmailDraft).toHaveBeenCalledWith(
      {},
      mockProduct,
      mockActivity,
      expect.any(String)
    );
    expect(mockOctokitInstance.rest.issues.create).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'owner',
        repo: 'cryyer',
        title: expect.stringContaining('Test App'),
        body: expect.stringContaining('Test Subject'),
        labels: ['draft', 'test-app'],
      })
    );
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
      .mockRejectedValueOnce(new Error('GitHub API error'))
      .mockResolvedValueOnce({ prs: [], releases: [], commits: [] });
    (generateEmailDraft as Mock).mockResolvedValue({ subject: 'S', body: 'B' });

    const mockOctokitInstance = {
      rest: {
        issues: {
          getLabel: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({ data: { html_url: 'url' } }),
        },
      },
    };
    // Use a regular function (not arrow) so it can be called with `new`
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (createLLMProvider as Mock).mockReturnValue({});

    // Should not throw — errors are caught per product
    await expect(main()).resolves.toBeUndefined();

    // Second product should still be attempted
    expect(gatherWeeklyActivity).toHaveBeenCalledTimes(2);
  });

  it('throws when GITHUB_TOKEN is missing', async () => {
    delete process.env['GITHUB_TOKEN'];
    await expect(main()).rejects.toThrow('Missing required environment variable: GITHUB_TOKEN');
  });

  it('throws when CRYYER_REPO is missing', async () => {
    delete process.env['CRYYER_REPO'];
    await expect(main()).rejects.toThrow('Missing required environment variable: CRYYER_REPO');
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
    // CRYYER_REPO is intentionally not set to verify it's not required in dry-run
    delete process.env['CRYYER_REPO'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prints draft to stdout and skips issue creation when DRY_RUN=true', async () => {
    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: 'friendly',
      repo: 'owner/test-app',
      emailSubjectTemplate: 'Weekly update {{weekOf}}',
    };
    const mockActivity = { prs: [], releases: [], commits: [] };
    const mockDraft = { subject: 'Test Subject', body: 'Test body content' };

    (loadProducts as Mock).mockReturnValue([mockProduct]);
    (gatherWeeklyActivity as Mock).mockResolvedValue(mockActivity);
    (generateEmailDraft as Mock).mockResolvedValue(mockDraft);

    const mockOctokitInstance = {
      rest: {
        issues: {
          getLabel: vi.fn(),
          createLabel: vi.fn(),
          create: vi.fn(),
        },
      },
    };
    (Octokit as unknown as Mock).mockImplementation(function () {
      return mockOctokitInstance;
    });
    (createLLMProvider as Mock).mockReturnValue({});

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main();

    // Issue creation should NOT have been called
    expect(mockOctokitInstance.rest.issues.create).not.toHaveBeenCalled();
    expect(mockOctokitInstance.rest.issues.getLabel).not.toHaveBeenCalled();

    // Output should contain the draft content
    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('[DRY RUN]');
    expect(output).toContain('Test Subject');

    consoleSpy.mockRestore();
  });

  it('does not require CRYYER_REPO in dry-run mode', async () => {
    delete process.env['CRYYER_REPO'];

    (loadProducts as Mock).mockReturnValue([]);
    (Octokit as unknown as Mock).mockImplementation(function () {
      return { rest: { issues: {} } };
    });
    (createLLMProvider as Mock).mockReturnValue({});

    await expect(main()).resolves.toBeUndefined();
  });
});
