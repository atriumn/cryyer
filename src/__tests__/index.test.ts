import { describe, it, expect } from 'vitest';
import { getWeekOf } from '../index.js';

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
