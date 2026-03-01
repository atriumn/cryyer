import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('readline/promises', () => ({
  createInterface: vi.fn(),
}));
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

import { sanitizeId, main } from '../init.js';
import { createInterface } from 'readline/promises';
import { existsSync, writeFileSync, mkdirSync } from 'fs';

describe('sanitizeId', () => {
  it('lowercases the input', () => {
    expect(sanitizeId('MyApp')).toBe('myapp');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeId('My App')).toBe('my-app');
  });

  it('replaces special characters with hyphens', () => {
    expect(sanitizeId('My App!')).toBe('my-app');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeId('My  App')).toBe('my-app');
  });

  it('strips leading and trailing hyphens', () => {
    expect(sanitizeId('!MyApp!')).toBe('myapp');
  });

  it('handles numeric characters', () => {
    expect(sanitizeId('App 2.0')).toBe('app-2-0');
  });
});

describe('main (init)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function makeRl(answers: string[]) {
    let callIndex = 0;
    const rl = {
      question: vi.fn().mockImplementation(() => Promise.resolve(answers[callIndex++] ?? '')),
      close: vi.fn(),
    };
    (createInterface as Mock).mockReturnValue(rl);
    return rl;
  }

  it('writes product YAML with provided values', async () => {
    (existsSync as Mock).mockReturnValue(false); // products dir exists check, file doesn't exist

    // Answers: name, id (blank=default), repo, subject (blank=default), voice
    makeRl(['My App', '', 'acme/my-app', '', 'Friendly tone']);

    await main();

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('my-app.yaml'),
      expect.stringContaining('acme/my-app'),
      'utf-8'
    );
  });

  it('uses custom product ID when provided', async () => {
    (existsSync as Mock).mockReturnValue(false);
    makeRl(['My App', 'custom-id', 'acme/my-app', '', 'Friendly tone']);

    await main();

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('custom-id.yaml'),
      expect.any(String),
      'utf-8'
    );
  });

  it('creates products dir if it does not exist', async () => {
    (existsSync as Mock).mockReturnValue(false);
    makeRl(['My App', '', 'acme/my-app', '', 'Friendly tone']);

    await main();

    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('products'), { recursive: true });
  });

  it('aborts if user declines overwrite', async () => {
    // First existsSync returns false (products dir), second returns true (yaml file already exists)
    (existsSync as Mock)
      .mockReturnValueOnce(true) // products dir exists
      .mockReturnValueOnce(true); // yaml file already exists

    // Answers: name, id, repo, subject, voice, overwrite=N
    makeRl(['My App', '', 'acme/my-app', '', 'Friendly tone', 'N']);

    await main();

    // Should not write the file
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('throws when product name is empty', async () => {
    (existsSync as Mock).mockReturnValue(false);
    makeRl(['']); // empty name

    await expect(main()).rejects.toThrow('Product name is required');
  });

  it('throws when repo format is invalid', async () => {
    (existsSync as Mock).mockReturnValue(false);
    makeRl(['My App', '', 'invalid-repo-no-slash', '', 'Friendly tone']);

    await expect(main()).rejects.toThrow('owner/repo format');
  });

  it('throws when voice is empty', async () => {
    (existsSync as Mock).mockReturnValue(false);
    makeRl(['My App', '', 'acme/my-app', '', '']); // empty voice

    await expect(main()).rejects.toThrow('Voice/tone is required');
  });
});
