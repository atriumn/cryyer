import { describe, it, expect, vi } from 'vitest';
import { markdownToHtml, sendEmails } from '../send.js';
import type { EmailProvider, EmailMessage } from '../email-provider.js';

describe('markdownToHtml', () => {
  it('converts headers', () => {
    expect(markdownToHtml('# Title')).toContain('<h1>Title</h1>');
    expect(markdownToHtml('## Subtitle')).toContain('<h2>Subtitle</h2>');
    expect(markdownToHtml('### Section')).toContain('<h3>Section</h3>');
  });

  it('converts bold text', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
  });

  it('converts italic text', () => {
    expect(markdownToHtml('*italic*')).toContain('<em>italic</em>');
  });

  it('converts links', () => {
    const result = markdownToHtml('[click here](https://example.com)');
    expect(result).toContain('<a href="https://example.com">click here</a>');
  });

  it('converts unordered list items and wraps in <ul>', () => {
    const result = markdownToHtml('- item one\n- item two');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>item one</li>');
    expect(result).toContain('<li>item two</li>');
    expect(result).toContain('</ul>');
  });

  it('wraps plain text in <p> tags', () => {
    const result = markdownToHtml('Hello world');
    expect(result).toContain('<p>Hello world</p>');
  });

  it('does not double-wrap block elements', () => {
    const result = markdownToHtml('# Title');
    expect(result).not.toContain('<p><h1>');
  });
});

describe('sendEmails', () => {
  const mockProduct = { id: 'test-app', name: 'Test App', voice: '', repo: 'o/r', emailSubjectTemplate: '' };

  it('returns zero stats when no subscribers', async () => {
    const provider: EmailProvider = { sendBatch: vi.fn() };
    const result = await sendEmails(provider, mockProduct, [], { subject: 'S', body: 'B' }, 'Sender', 'from@test.com');
    expect(result).toEqual({ sent: 0, failed: 0, failures: [] });
    expect(provider.sendBatch).not.toHaveBeenCalled();
  });

  it('builds email messages and delegates to provider', async () => {
    let capturedEmails: EmailMessage[] = [];
    const provider: EmailProvider = {
      sendBatch: vi.fn(async (emails) => {
        capturedEmails = emails;
        return { sent: 2, failed: 0, failures: [] };
      }),
    };

    const subscribers = [{ email: 'a@test.com' }, { email: 'b@test.com', name: 'Bob' }];
    const result = await sendEmails(
      provider,
      mockProduct,
      subscribers,
      { subject: 'Test Subject', body: '**Hello** world' },
      'My Name',
      'from@test.com'
    );

    expect(result.sent).toBe(2);
    expect(capturedEmails).toHaveLength(2);

    // Check from field
    expect(capturedEmails[0].from).toBe('My Name <from@test.com>');

    // Check to field
    expect(capturedEmails[0].to).toBe('a@test.com');
    expect(capturedEmails[1].to).toBe('b@test.com');

    // Check subject
    expect(capturedEmails[0].subject).toBe('Test Subject');

    // Check HTML contains converted markdown
    expect(capturedEmails[0].html).toContain('<strong>Hello</strong>');

    // Check unsubscribe header
    expect(capturedEmails[0].headers!['List-Unsubscribe']).toContain('mailto:from@test.com');
    expect(capturedEmails[0].headers!['List-Unsubscribe']).toContain('unsubscribe');
  });

  it('includes replyTo when provided', async () => {
    let capturedEmails: EmailMessage[] = [];
    const provider: EmailProvider = {
      sendBatch: vi.fn(async (emails) => {
        capturedEmails = emails;
        return { sent: 1, failed: 0, failures: [] };
      }),
    };

    await sendEmails(
      provider,
      mockProduct,
      [{ email: 'a@test.com' }],
      { subject: 'S', body: 'B' },
      'Name',
      'from@test.com',
      'reply@test.com'
    );

    expect(capturedEmails[0].replyTo).toBe('reply@test.com');
  });

  it('omits replyTo when not provided', async () => {
    let capturedEmails: EmailMessage[] = [];
    const provider: EmailProvider = {
      sendBatch: vi.fn(async (emails) => {
        capturedEmails = emails;
        return { sent: 1, failed: 0, failures: [] };
      }),
    };

    await sendEmails(
      provider,
      mockProduct,
      [{ email: 'a@test.com' }],
      { subject: 'S', body: 'B' },
      'Name',
      'from@test.com'
    );

    expect(capturedEmails[0].replyTo).toBeUndefined();
  });

  it('returns provider stats including failures', async () => {
    const provider: EmailProvider = {
      sendBatch: vi.fn(async () => ({
        sent: 1,
        failed: 1,
        failures: [{ email: 'bad@test.com', error: 'bounce' }],
      })),
    };

    const result = await sendEmails(
      provider,
      mockProduct,
      [{ email: 'a@test.com' }, { email: 'bad@test.com' }],
      { subject: 'S', body: 'B' },
      'Name',
      'from@test.com'
    );

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failures[0].email).toBe('bad@test.com');
  });
});
