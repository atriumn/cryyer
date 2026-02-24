import { describe, it, expect, afterEach, vi } from 'vitest';
import { getWeekOf, requireEnv, ensureLabel } from '../draft.js';

describe('getWeekOf', () => {
  it('returns a date string in YYYY-MM-DD format', () => {
    const result = getWeekOf();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a Monday', () => {
    const result = getWeekOf();
    const date = new Date(result);
    // 1 = Monday
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
  it('does not throw if label already exists', async () => {
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
