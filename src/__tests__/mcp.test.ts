import { describe, it, expect, afterEach, vi, beforeEach, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { formatIssueBody, getCryyerRepo, extractProductLabel, createServer } from '../mcp.js';
import type { McpDeps } from '../mcp.js';
import { parseIssueBody } from '../send-on-close.js';
import { subscriberKey } from '../types.js';
import type { Product } from '../types.js';

// --- Helper: build mock deps ---

function mockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'my-app',
    name: 'My App',
    voice: 'friendly',
    repo: 'owner/my-app',
    emailSubjectTemplate: '{{weekOf}} Update',
    ...overrides,
  };
}

function mockDeps(overrides: Partial<McpDeps> = {}): McpDeps {
  return {
    octokit: {
      rest: {
        issues: {
          listForRepo: vi.fn().mockResolvedValue({ data: [] }),
          get: vi.fn().mockResolvedValue({ data: { body: '', labels: [], title: 'Test', state: 'open' } }),
          update: vi.fn().mockResolvedValue({}),
          addLabels: vi.fn().mockResolvedValue({}),
          createComment: vi.fn().mockResolvedValue({}),
          getLabel: vi.fn().mockResolvedValue({}),
          createLabel: vi.fn().mockResolvedValue({}),
        },
      },
    } as unknown as McpDeps['octokit'],
    getProducts: () => [mockProduct()],
    getCryyerRepo: () => ({ owner: 'acme', repo: 'cryyer' }),
    createStore: () => ({
      getSubscribers: vi.fn().mockResolvedValue([]),
      recordEmailSent: vi.fn(),
      addSubscriber: vi.fn(),
      removeSubscriber: vi.fn(),
    }),
    createEmailProvider: () => ({
      sendBatch: vi.fn().mockResolvedValue({ sent: 0, failed: 0, failures: [] }),
    }),
    createLLMProvider: () => ({
      generate: vi.fn().mockResolvedValue('{"subject":"S","body":"B"}'),
    }),
    gatherActivity: vi.fn().mockResolvedValue([]),
    generateEmailDraft: vi.fn().mockResolvedValue({ subject: 'Generated Subject', body: 'Generated Body' }),
    fromEmail: 'from@test.com',
    fromName: 'Test Updates',
    ...overrides,
  };
}

// --- Helper: connect client to server ---

async function setupClientServer(deps: McpDeps) {
  const server = createServer(deps);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return { client, server };
}

function getText(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content.map((c) => c.text ?? '').join('');
}

// --- Pure helper tests (no MCP needed) ---

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
  ] as Product[];

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

describe('audience label extraction (pattern used by MCP tools)', () => {
  it('extracts audience id from audience: label', () => {
    const labels = ['draft', 'my-app', 'audience:beta'];
    const audienceLabel = labels.find((l) => l.startsWith('audience:'));
    const audienceId = audienceLabel?.slice('audience:'.length);
    expect(audienceId).toBe('beta');
  });

  it('returns undefined when no audience label present', () => {
    const labels = ['draft', 'my-app'];
    const audienceLabel = labels.find((l) => l.startsWith('audience:'));
    const audienceId = audienceLabel?.slice('audience:'.length);
    expect(audienceId).toBeUndefined();
  });

  it('produces compound subscriber key with audience', () => {
    expect(subscriberKey('my-app', 'beta')).toBe('my-app:beta');
  });

  it('produces plain subscriber key without audience', () => {
    expect(subscriberKey('my-app', undefined)).toBe('my-app');
  });
});

// --- MCP tool handler tests via InMemoryTransport ---

describe('MCP tools via InMemoryTransport', () => {
  let client: Client;
  let deps: McpDeps;

  afterAll(async () => {
    try { await client?.close(); } catch { /* ignore */ }
  });

  describe('list_drafts', () => {
    it('returns empty message when no drafts exist', async () => {
      deps = mockDeps();
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'list_drafts', arguments: {} });
      expect(getText(result as any)).toBe('No open draft issues found.');
    });

    it('lists open draft issues with product labels', async () => {
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              listForRepo: vi.fn().mockResolvedValue({
                data: [
                  { number: 1, title: 'Draft 1', labels: [{ name: 'draft' }, { name: 'my-app' }] },
                  { number: 2, title: 'Draft 2', labels: [{ name: 'draft' }] },
                ],
              }),
            },
          },
        } as any,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'list_drafts', arguments: {} });
      const text = getText(result as any);
      expect(text).toContain('#1 — Draft 1 [product: my-app]');
      expect(text).toContain('#2 — Draft 2 [product: unknown]');
    });
  });

  describe('get_draft', () => {
    it('returns parsed draft content with subscriber count', async () => {
      const mockStore = {
        getSubscribers: vi.fn().mockResolvedValue([{ email: 'a@test.com' }, { email: 'b@test.com' }]),
        recordEmailSent: vi.fn(),
        addSubscriber: vi.fn(),
        removeSubscriber: vi.fn(),
      };
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** Weekly Update\n\n---\n\nHello testers!',
                  labels: [{ name: 'draft' }, { name: 'my-app' }],
                  title: 'Draft #1',
                  state: 'open',
                },
              }),
            },
          },
        } as any,
        createStore: () => mockStore,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'get_draft', arguments: { issue_number: 1 } });
      const text = getText(result as any);
      expect(text).toContain('Subject: Weekly Update');
      expect(text).toContain('Hello testers!');
      expect(text).toContain('2');
      expect(text).toContain('my-app');
    });

    it('returns error when issue body cannot be parsed', async () => {
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: { body: 'invalid format', labels: [], title: 'Bad', state: 'open' },
              }),
            },
          },
        } as any,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'get_draft', arguments: { issue_number: 1 } });
      expect((result as any).isError).toBe(true);
      expect(getText(result as any)).toContain('Could not parse');
    });

    it('shows (unable to fetch) when store throws', async () => {
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** Test\n\n---\n\nBody',
                  labels: [{ name: 'my-app' }],
                  title: 'Test',
                  state: 'open',
                },
              }),
            },
          },
        } as any,
        createStore: () => ({
          getSubscribers: vi.fn().mockRejectedValue(new Error('DB down')),
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'get_draft', arguments: { issue_number: 1 } });
      expect(getText(result as any)).toContain('unable to fetch');
    });
  });

  describe('update_draft', () => {
    it('updates issue body with formatted subject/body', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      deps = mockDeps({
        octokit: {
          rest: {
            issues: { update: mockUpdate },
          },
        } as any,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({
        name: 'update_draft',
        arguments: { issue_number: 5, subject: 'New Subject', body: 'New Body' },
      });
      expect(getText(result as any)).toContain('Updated issue #5');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        owner: 'acme',
        repo: 'cryyer',
        issue_number: 5,
        body: '**Subject:** New Subject\n\n---\n\nNew Body',
      }));
    });
  });

  describe('send_draft', () => {
    it('sends emails, closes issue, posts stats comment', async () => {
      const mockStore = {
        getSubscribers: vi.fn().mockResolvedValue([{ email: 'user@test.com', name: 'User' }]),
        recordEmailSent: vi.fn(),
        addSubscriber: vi.fn(),
        removeSubscriber: vi.fn(),
      };
      const mockEmailProvider = {
        sendBatch: vi.fn().mockResolvedValue({ sent: 1, failed: 0, failures: [] }),
      };
      const mockUpdate = vi.fn().mockResolvedValue({});
      const mockAddLabels = vi.fn().mockResolvedValue({});
      const mockCreateComment = vi.fn().mockResolvedValue({});

      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** Test Update\n\n---\n\nHello!',
                  labels: [{ name: 'draft' }, { name: 'my-app' }],
                  title: 'Draft',
                  state: 'open',
                },
              }),
              update: mockUpdate,
              addLabels: mockAddLabels,
              createComment: mockCreateComment,
              getLabel: vi.fn().mockResolvedValue({}),
              createLabel: vi.fn().mockResolvedValue({}),
            },
          },
        } as any,
        createStore: () => mockStore,
        createEmailProvider: () => mockEmailProvider,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'send_draft', arguments: { issue_number: 10 } });
      const text = getText(result as any);
      expect(text).toContain('Sent 1 emails');
      expect(text).toContain('0 failed');
      expect(text).toContain('Issue #10 closed');

      // Verify sent label added
      expect(mockAddLabels).toHaveBeenCalledWith(expect.objectContaining({ labels: ['sent'] }));

      // Verify issue closed
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ state: 'closed' }));

      // Verify stats comment posted
      expect(mockCreateComment).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.stringContaining('Sent: 1'),
      }));
    });

    it('aborts when issue already has sent label', async () => {
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** S\n\n---\n\nB',
                  labels: [{ name: 'draft' }, { name: 'my-app' }, { name: 'sent' }],
                  title: 'Draft',
                  state: 'closed',
                },
              }),
            },
          },
        } as any,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'send_draft', arguments: { issue_number: 10 } });
      expect((result as any).isError).toBe(true);
      expect(getText(result as any)).toContain('already been sent');
    });

    it('returns error when no product label matches', async () => {
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** S\n\n---\n\nB',
                  labels: [{ name: 'draft' }],
                  title: 'Draft',
                  state: 'open',
                },
              }),
            },
          },
        } as any,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'send_draft', arguments: { issue_number: 10 } });
      expect((result as any).isError).toBe(true);
      expect(getText(result as any)).toContain('No matching product label');
    });

    it('returns error when issue body cannot be parsed', async () => {
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: 'bad body',
                  labels: [{ name: 'draft' }, { name: 'my-app' }],
                  title: 'Draft',
                  state: 'open',
                },
              }),
            },
          },
        } as any,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'send_draft', arguments: { issue_number: 10 } });
      expect((result as any).isError).toBe(true);
      expect(getText(result as any)).toContain('Could not parse');
    });

    it('returns message when no subscribers found', async () => {
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** S\n\n---\n\nB',
                  labels: [{ name: 'draft' }, { name: 'my-app' }],
                  title: 'Draft',
                  state: 'open',
                },
              }),
            },
          },
        } as any,
        createStore: () => ({
          getSubscribers: vi.fn().mockResolvedValue([]),
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'send_draft', arguments: { issue_number: 10 } });
      expect(getText(result as any)).toContain('No active subscribers');
    });

    it('uses compound subscriber key when audience label present', async () => {
      const mockGetSubscribers = vi.fn().mockResolvedValue([{ email: 'beta@test.com' }]);
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** Beta\n\n---\n\nBeta content',
                  labels: [{ name: 'draft' }, { name: 'my-app' }, { name: 'audience:beta' }],
                  title: 'Draft',
                  state: 'open',
                },
              }),
              update: vi.fn().mockResolvedValue({}),
              addLabels: vi.fn().mockResolvedValue({}),
              createComment: vi.fn().mockResolvedValue({}),
              getLabel: vi.fn().mockResolvedValue({}),
              createLabel: vi.fn().mockResolvedValue({}),
            },
          },
        } as any,
        createStore: () => ({
          getSubscribers: mockGetSubscribers,
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: vi.fn(),
        }),
        createEmailProvider: () => ({
          sendBatch: vi.fn().mockResolvedValue({ sent: 1, failed: 0, failures: [] }),
        }),
      });
      ({ client } = await setupClientServer(deps));

      await client.callTool({ name: 'send_draft', arguments: { issue_number: 10 } });
      expect(mockGetSubscribers).toHaveBeenCalledWith('my-app:beta');
    });
  });

  describe('regenerate_draft', () => {
    it('regenerates draft and updates issue', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** Old\n\n---\n\nOld body',
                  labels: [{ name: 'draft' }, { name: 'my-app' }],
                  title: 'Draft',
                  state: 'open',
                },
              }),
              update: mockUpdate,
            },
          },
        } as any,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'regenerate_draft', arguments: { issue_number: 3 } });
      const text = getText(result as any);
      expect(text).toContain('Regenerated draft');
      expect(text).toContain('Generated Subject');
      expect(text).toContain('Generated Body');

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        body: '**Subject:** Generated Subject\n\n---\n\nGenerated Body',
      }));
    });

    it('returns error when no product label found', async () => {
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** S\n\n---\n\nB',
                  labels: [{ name: 'draft' }],
                  title: 'Draft',
                  state: 'open',
                },
              }),
            },
          },
        } as any,
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'regenerate_draft', arguments: { issue_number: 3 } });
      expect((result as any).isError).toBe(true);
      expect(getText(result as any)).toContain('No matching product label');
    });

    it('passes audience to generateEmailDraft when audience label present', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({ subject: 'S', body: 'B' });
      deps = mockDeps({
        octokit: {
          rest: {
            issues: {
              get: vi.fn().mockResolvedValue({
                data: {
                  body: '**Subject:** S\n\n---\n\nB',
                  labels: [{ name: 'draft' }, { name: 'my-app' }, { name: 'audience:beta' }],
                  title: 'Draft',
                  state: 'open',
                },
              }),
              update: vi.fn().mockResolvedValue({}),
            },
          },
        } as any,
        getProducts: () => [mockProduct({
          audiences: [
            { id: 'beta', voice: 'casual', emailSubjectTemplate: 'Beta Update' },
            { id: 'enterprise', voice: 'formal', emailSubjectTemplate: 'Enterprise Update' },
          ],
        })],
        generateEmailDraft: mockGenerate,
      });
      ({ client } = await setupClientServer(deps));

      await client.callTool({ name: 'regenerate_draft', arguments: { issue_number: 3 } });
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.anything(), // llm
        expect.anything(), // product
        expect.anything(), // activity
        expect.any(String), // weekOf
        undefined, // extraContext
        expect.objectContaining({ id: 'beta', voice: 'casual' }), // audience
      );
    });
  });

  describe('list_products', () => {
    it('lists products with subscriber counts', async () => {
      deps = mockDeps({
        createStore: () => ({
          getSubscribers: vi.fn().mockResolvedValue([{ email: 'a@test.com' }]),
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'list_products', arguments: {} });
      const text = getText(result as any);
      expect(text).toContain('my-app: My App (1 subscribers)');
    });

    it('shows audiences for multi-audience products', async () => {
      deps = mockDeps({
        getProducts: () => [mockProduct({
          voice: undefined,
          emailSubjectTemplate: undefined,
          audiences: [
            { id: 'beta', voice: 'casual', emailSubjectTemplate: 'Beta' },
            { id: 'enterprise', voice: 'formal', emailSubjectTemplate: 'Enterprise' },
          ],
        })],
        createStore: () => ({
          getSubscribers: vi.fn().mockResolvedValue([]),
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'list_products', arguments: {} });
      const text = getText(result as any);
      expect(text).toContain('my-app: My App');
      expect(text).toContain('audience: beta');
      expect(text).toContain('audience: enterprise');
    });

    it('returns message when no products configured', async () => {
      deps = mockDeps({ getProducts: () => [] });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'list_products', arguments: {} });
      expect(getText(result as any)).toBe('No products configured.');
    });

    it('hides subscriber count when store throws', async () => {
      deps = mockDeps({
        createStore: () => ({
          getSubscribers: vi.fn().mockRejectedValue(new Error('DB error')),
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({ name: 'list_products', arguments: {} });
      const text = getText(result as any);
      expect(text).toContain('my-app: My App');
      expect(text).not.toContain('subscribers');
    });
  });

  describe('list_subscribers', () => {
    it('lists subscribers for a product', async () => {
      const mockGetSubs = vi.fn().mockResolvedValue([
        { email: 'alice@test.com', name: 'Alice' },
        { email: 'bob@test.com' },
      ]);
      deps = mockDeps({
        createStore: () => ({
          getSubscribers: mockGetSubs,
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({
        name: 'list_subscribers',
        arguments: { product_id: 'my-app' },
      });
      const text = getText(result as any);
      expect(text).toContain('2 subscribers');
      expect(text).toContain('alice@test.com (Alice)');
      expect(text).toContain('bob@test.com');
      expect(mockGetSubs).toHaveBeenCalledWith('my-app');
    });

    it('returns empty message when no subscribers', async () => {
      deps = mockDeps();
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({
        name: 'list_subscribers',
        arguments: { product_id: 'my-app' },
      });
      expect(getText(result as any)).toContain('No subscribers found');
    });

    it('uses compound key with audience_id', async () => {
      const mockGetSubs = vi.fn().mockResolvedValue([{ email: 'beta@test.com' }]);
      deps = mockDeps({
        createStore: () => ({
          getSubscribers: mockGetSubs,
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      await client.callTool({
        name: 'list_subscribers',
        arguments: { product_id: 'my-app', audience_id: 'beta' },
      });
      expect(mockGetSubs).toHaveBeenCalledWith('my-app:beta');
    });
  });

  describe('add_subscriber', () => {
    it('adds subscriber and returns confirmation', async () => {
      const mockAdd = vi.fn();
      deps = mockDeps({
        createStore: () => ({
          getSubscribers: vi.fn(),
          recordEmailSent: vi.fn(),
          addSubscriber: mockAdd,
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({
        name: 'add_subscriber',
        arguments: { product_id: 'my-app', email: 'new@test.com', name: 'New User' },
      });
      expect(getText(result as any)).toContain('Added new@test.com to my-app');
      expect(mockAdd).toHaveBeenCalledWith('my-app', 'new@test.com', 'New User');
    });

    it('uses compound key with audience_id', async () => {
      const mockAdd = vi.fn();
      deps = mockDeps({
        createStore: () => ({
          getSubscribers: vi.fn(),
          recordEmailSent: vi.fn(),
          addSubscriber: mockAdd,
          removeSubscriber: vi.fn(),
        }),
      });
      ({ client } = await setupClientServer(deps));

      await client.callTool({
        name: 'add_subscriber',
        arguments: { product_id: 'my-app', email: 'new@test.com', audience_id: 'beta' },
      });
      expect(mockAdd).toHaveBeenCalledWith('my-app:beta', 'new@test.com', undefined);
    });
  });

  describe('remove_subscriber', () => {
    it('removes subscriber and returns confirmation', async () => {
      const mockRemove = vi.fn();
      deps = mockDeps({
        createStore: () => ({
          getSubscribers: vi.fn(),
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: mockRemove,
        }),
      });
      ({ client } = await setupClientServer(deps));

      const result = await client.callTool({
        name: 'remove_subscriber',
        arguments: { product_id: 'my-app', email: 'old@test.com' },
      });
      expect(getText(result as any)).toContain('Removed old@test.com from my-app');
      expect(mockRemove).toHaveBeenCalledWith('my-app', 'old@test.com');
    });

    it('uses compound key with audience_id', async () => {
      const mockRemove = vi.fn();
      deps = mockDeps({
        createStore: () => ({
          getSubscribers: vi.fn(),
          recordEmailSent: vi.fn(),
          addSubscriber: vi.fn(),
          removeSubscriber: mockRemove,
        }),
      });
      ({ client } = await setupClientServer(deps));

      await client.callTool({
        name: 'remove_subscriber',
        arguments: { product_id: 'my-app', email: 'old@test.com', audience_id: 'beta' },
      });
      expect(mockRemove).toHaveBeenCalledWith('my-app:beta', 'old@test.com');
    });
  });

  describe('review_drafts prompt', () => {
    it('returns the review prompt message', async () => {
      deps = mockDeps();
      ({ client } = await setupClientServer(deps));

      const result = await client.getPrompt({ name: 'review_drafts' });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      const text = (result.messages[0].content as { type: string; text: string }).text;
      expect(text).toContain('list_drafts');
      expect(text).toContain('get_draft');
      expect(text).toContain('update_draft');
      expect(text).toContain('regenerate_draft');
    });
  });
});
