import { describe, it, expect } from 'vitest';
import { isBot } from '../gather.js';

describe('isBot', () => {
  it('returns true for known bot logins', () => {
    expect(isBot('dependabot')).toBe(true);
    expect(isBot('dependabot[bot]')).toBe(true);
    expect(isBot('renovate')).toBe(true);
    expect(isBot('renovate[bot]')).toBe(true);
    expect(isBot('github-actions[bot]')).toBe(true);
  });

  it('returns true for any login ending in [bot]', () => {
    expect(isBot('some-custom-app[bot]')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isBot('Dependabot')).toBe(true);
    expect(isBot('DEPENDABOT[BOT]')).toBe(true);
    expect(isBot('Renovate[Bot]')).toBe(true);
  });

  it('returns false for regular users', () => {
    expect(isBot('octocat')).toBe(false);
    expect(isBot('jeff')).toBe(false);
  });

  it('returns false for undefined/empty', () => {
    expect(isBot(undefined)).toBe(false);
    expect(isBot('')).toBe(false);
  });
});
