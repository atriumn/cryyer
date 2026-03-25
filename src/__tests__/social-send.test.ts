import { describe, it, expect } from 'vitest';
import { parseArgv } from '../social/send.js';

describe('social send parseArgv', () => {
  it('parses a positional draft path', () => {
    const result = parseArgv(['social-drafts/noxaudit-2026-03-24.md']);
    expect(result.draftPath).toBe('social-drafts/noxaudit-2026-03-24.md');
    expect(result.dryRun).toBe(false);
  });

  it('parses --dry-run flag', () => {
    const result = parseArgv(['draft.md', '--dry-run']);
    expect(result.draftPath).toBe('draft.md');
    expect(result.dryRun).toBe(true);
  });

  it('strips leading "send" command word', () => {
    const result = parseArgv(['send', 'draft.md']);
    expect(result.draftPath).toBe('draft.md');
  });

  it('throws when no draft path provided', () => {
    expect(() => parseArgv(['--dry-run'])).toThrow('Missing draft path');
  });
});
