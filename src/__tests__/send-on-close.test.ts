import { describe, it, expect } from 'vitest';
import { parseIssueBody } from '../send-on-close.js';

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
