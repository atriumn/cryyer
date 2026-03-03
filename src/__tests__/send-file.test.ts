import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock external modules before importing
vi.mock('../config.js', () => ({ loadProducts: vi.fn() }));
vi.mock('../subscriber-store.js', () => ({ createSubscriberStore: vi.fn() }));
vi.mock('../send.js', () => ({ sendWeeklyEmails: vi.fn() }));
vi.mock('../email-provider.js', () => ({ createEmailProvider: vi.fn() }));
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return { ...actual, readFileSync: vi.fn() };
});

import { parseDraftFile, parseArgv, main } from '../send-file.js';
import { loadProducts } from '../config.js';
import { createSubscriberStore } from '../subscriber-store.js';
import { sendWeeklyEmails } from '../send.js';
import { createEmailProvider } from '../email-provider.js';
import { readFileSync } from 'fs';

describe('parseDraftFile', () => {
  it('parses a well-formed draft file', () => {
    const content = '---\nsubject: "tokencost-dev v0.1.4 — What\'s New"\n---\n\n## Highlights\n\nThis week we shipped...';
    const result = parseDraftFile(content);
    expect(result).toEqual({
      subject: "tokencost-dev v0.1.4 — What's New",
      body: '## Highlights\n\nThis week we shipped...',
    });
  });

  it('parses unquoted subject', () => {
    const content = '---\nsubject: Weekly Update\n---\n\nBody text here';
    const result = parseDraftFile(content);
    expect(result).toEqual({
      subject: 'Weekly Update',
      body: 'Body text here',
    });
  });

  it('throws on missing front matter', () => {
    expect(() => parseDraftFile('No front matter here')).toThrow('Invalid draft file');
  });

  it('throws on missing subject in front matter', () => {
    expect(() => parseDraftFile('---\ntitle: Something\n---\n\nBody')).toThrow('missing "subject"');
  });

  it('throws on empty subject', () => {
    expect(() => parseDraftFile('---\nsubject: ""\n---\n\nBody')).toThrow('missing "subject"');
  });

  it('handles multiline body with markdown', () => {
    const content = '---\nsubject: Release Notes\n---\n\n## What\'s New\n\n- Feature A\n- Feature B\n\nThanks!';
    const result = parseDraftFile(content);
    expect(result.subject).toBe('Release Notes');
    expect(result.body).toContain('## What\'s New');
    expect(result.body).toContain('- Feature A');
    expect(result.body).toContain('Thanks!');
  });
});

describe('parseArgv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('parses positional path and --product flag', () => {
    const result = parseArgv(['send-file', 'drafts/v1.0.md', '--product', 'my-app']);
    expect(result).toEqual({ filePath: 'drafts/v1.0.md', productId: 'my-app', dryRun: false });
  });

  it('parses without command prefix', () => {
    const result = parseArgv(['drafts/v1.0.md', '--product', 'my-app']);
    expect(result).toEqual({ filePath: 'drafts/v1.0.md', productId: 'my-app', dryRun: false });
  });

  it('parses --dry-run flag', () => {
    const result = parseArgv(['drafts/v1.0.md', '--product', 'my-app', '--dry-run']);
    expect(result.dryRun).toBe(true);
  });

  it('falls back to env vars', () => {
    process.env['DRAFT_FILE'] = 'env-file.md';
    process.env['PRODUCT_ID'] = 'env-product';
    const result = parseArgv([]);
    expect(result).toEqual({ filePath: 'env-file.md', productId: 'env-product', dryRun: false });
  });

  it('throws when file path is missing', () => {
    delete process.env['DRAFT_FILE'];
    expect(() => parseArgv(['--product', 'my-app'])).toThrow('Missing draft file path');
  });

  it('throws when product is missing', () => {
    delete process.env['PRODUCT_ID'];
    expect(() => parseArgv(['drafts/v1.0.md'])).toThrow('Missing --product');
  });
});

describe('main', () => {
  const originalEnv = { ...process.env };
  const originalArgv = [...process.argv];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['FROM_EMAIL'] = 'test@example.com';
    process.env['FROM_NAME'] = 'Test';
    process.env['RESEND_API_KEY'] = 'test-key';
    process.argv = ['node', 'send-file.js', 'drafts/v1.0.md', '--product', 'test-app'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
  });

  it('reads file, parses, and sends emails', async () => {
    const draftContent = '---\nsubject: Test Subject\n---\n\nTest body';
    (readFileSync as Mock).mockReturnValue(draftContent);

    const mockProduct = {
      id: 'test-app',
      name: 'Test App',
      voice: 'friendly',
      repo: 'owner/test-app',
      emailSubjectTemplate: 'Weekly update',
    };
    (loadProducts as Mock).mockReturnValue([mockProduct]);

    const mockStore = { getSubscribers: vi.fn().mockResolvedValue([{ email: 'user@example.com' }]) };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);

    const mockProvider = {};
    (createEmailProvider as Mock).mockReturnValue(mockProvider);

    (sendWeeklyEmails as Mock).mockResolvedValue({ sent: 1, failed: 0, failures: [] });

    await main();

    expect(sendWeeklyEmails).toHaveBeenCalledWith(
      mockProvider,
      mockProduct,
      [{ email: 'user@example.com' }],
      { subject: 'Test Subject', body: 'Test body' },
      'Test',
      'test@example.com',
      undefined
    );
  });

  it('skips sending when no subscribers', async () => {
    const draftContent = '---\nsubject: Test Subject\n---\n\nTest body';
    (readFileSync as Mock).mockReturnValue(draftContent);

    (loadProducts as Mock).mockReturnValue([
      { id: 'test-app', name: 'Test App', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);

    const mockStore = { getSubscribers: vi.fn().mockResolvedValue([]) };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await main();

    expect(sendWeeklyEmails).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No active subscribers'));
    warnSpy.mockRestore();
  });

  it('prints preview in dry-run mode', async () => {
    process.argv = ['node', 'send-file.js', 'drafts/v1.0.md', '--product', 'test-app', '--dry-run'];
    delete process.env['FROM_EMAIL'];

    const draftContent = '---\nsubject: Test Subject\n---\n\nTest body';
    (readFileSync as Mock).mockReturnValue(draftContent);

    (loadProducts as Mock).mockReturnValue([
      { id: 'test-app', name: 'Test App', voice: '', repo: 'o/r', emailSubjectTemplate: '' },
    ]);

    const mockStore = { getSubscribers: vi.fn().mockResolvedValue([{ email: 'u@e.com' }]) };
    (createSubscriberStore as Mock).mockReturnValue(mockStore);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main();

    expect(sendWeeklyEmails).not.toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('[DRY RUN]');
    expect(output).toContain('Test Subject');
    consoleSpy.mockRestore();
  });

  it('throws when product not found', async () => {
    const draftContent = '---\nsubject: Test Subject\n---\n\nTest body';
    (readFileSync as Mock).mockReturnValue(draftContent);
    (loadProducts as Mock).mockReturnValue([]);

    await expect(main()).rejects.toThrow('Product not found: test-app');
  });
});
