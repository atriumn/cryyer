import { describe, it, expect, afterEach } from 'vitest';
import { formatIssueBody, getCryyerRepo, extractProductLabel } from '../mcp.js';
import { parseIssueBody } from '../send-on-close.js';

describe('formatIssueBody / parseIssueBody round-trip', () => {
  it('round-trips a simple subject and body', () => {
    const subject = 'Weekly Update for My App';
    const body = 'Here is what happened this week.\n\n- Feature A landed\n- Bug B fixed';

    const formatted = formatIssueBody(subject, body);
    const parsed = parseIssueBody(formatted);

    expect(parsed).not.toBeNull();
    expect(parsed!.subject).toBe(subject);
    expect(parsed!.emailBody).toBe(body);
  });

  it('round-trips subject with special characters', () => {
    const subject = 'My App — Week of 2026-02-23 (v2.0!)';
    const body = 'Some **bold** and *italic* text.';

    const formatted = formatIssueBody(subject, body);
    const parsed = parseIssueBody(formatted);

    expect(parsed).not.toBeNull();
    expect(parsed!.subject).toBe(subject);
    expect(parsed!.emailBody).toBe(body);
  });

  it('round-trips multiline body with markdown', () => {
    const subject = 'Update';
    const body = '## Highlights\n\n- PR #1: Add feature\n- PR #2: Fix bug\n\n## Coming Next\n\nStay tuned!';

    const formatted = formatIssueBody(subject, body);
    const parsed = parseIssueBody(formatted);

    expect(parsed).not.toBeNull();
    expect(parsed!.subject).toBe(subject);
    expect(parsed!.emailBody).toBe(body);
  });
});

describe('getCryyerRepo', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('parses owner/repo from CRYYER_REPO', () => {
    process.env['CRYYER_REPO'] = 'acme/cryyer';
    const result = getCryyerRepo();
    expect(result).toEqual({ owner: 'acme', repo: 'cryyer' });
  });

  it('throws when CRYYER_REPO is missing', () => {
    delete process.env['CRYYER_REPO'];
    expect(() => getCryyerRepo()).toThrow('Missing required environment variable: CRYYER_REPO');
  });

  it('throws on invalid format', () => {
    process.env['CRYYER_REPO'] = 'just-a-name';
    expect(() => getCryyerRepo()).toThrow('Invalid CRYYER_REPO format');
  });
});

describe('extractProductLabel', () => {
  const products = [
    { id: 'my-app', name: 'My App', voice: '', emailSubjectTemplate: '', repo: 'o/r' },
    { id: 'other-app', name: 'Other App', voice: '', emailSubjectTemplate: '', repo: 'o/r2' },
  ];

  it('finds a matching product label', () => {
    expect(extractProductLabel(['draft', 'my-app'], products)).toBe('my-app');
  });

  it('returns undefined when no product label matches', () => {
    expect(extractProductLabel(['draft', 'unknown'], products)).toBeUndefined();
  });

  it('returns the first matching product label', () => {
    expect(extractProductLabel(['draft', 'other-app', 'my-app'], products)).toBe('other-app');
  });
});
