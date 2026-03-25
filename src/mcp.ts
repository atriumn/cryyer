#!/usr/bin/env node

import { join } from 'path';
import { readdirSync, existsSync } from 'fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Octokit } from 'octokit';
import { loadProducts } from './config.js';
import { parseIssueBody } from './send-on-close.js';
import { sendEmails } from './send.js';
import { createSubscriberStore } from './subscriber-store.js';
import { createEmailProvider } from './email-provider.js';
import { gatherActivity } from './gather.js';
import { generateEmailDraft } from './summarize.js';
import { createLLMProvider } from './llm-provider.js';
import { appendSeed } from './social/seed.js';
import { parseSeeds } from './social/parse-seeds.js';
import { loadPlatforms } from './social/platforms.js';
import { generateSocialPosts } from './social/generate.js';
import { writeSocialDraft, readSocialDraft } from './social/draft-file.js';
import * as bufferProvider from './social/buffer-provider.js';
import type { Product, BetaTester } from './types.js';
import type { SubscriberStore } from './subscriber-store.js';
import type { EmailProvider } from './email-provider.js';
import type { LLMProvider } from './llm-provider.js';
import type { ContentType, SocialDraft } from './social/types.js';
import { subscriberKey, resolveAudiences } from './types.js';

// --- Helpers ---

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function getCryyerRepo(): { owner: string; repo: string } {
  const cryyerRepo = requireEnv('CRYYER_REPO');
  const parts = cryyerRepo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid CRYYER_REPO format: "${cryyerRepo}". Expected "owner/repo".`);
  }
  return { owner: parts[0], repo: parts[1] };
}

export function formatIssueBody(subject: string, body: string): string {
  return `**Subject:** ${subject}\n\n---\n\n${body}`;
}

export function extractProductLabel(
  labelNames: string[],
  products: Product[]
): string | undefined {
  const productIds = new Set(products.map((p) => p.id));
  return labelNames.find((l) => productIds.has(l));
}

function getLabelNames(issue: { labels: Array<string | { name?: string }> }): string[] {
  return issue.labels.map((l) => (typeof l === 'string' ? l : (l.name ?? '')));
}

function getWeekOf(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  return monday.toISOString().split('T')[0];
}

async function ensureLabel(
  octokit: Octokit,
  owner: string,
  repo: string,
  name: string,
  color: string
): Promise<void> {
  try {
    await octokit.rest.issues.getLabel({ owner, repo, name });
  } catch {
    try {
      await octokit.rest.issues.createLabel({ owner, repo, name, color });
    } catch {
      // May already exist due to race condition
    }
  }
}

// --- Dependency injection ---

export interface McpDeps {
  octokit: Octokit;
  getProducts: () => Product[];
  getCryyerRepo: () => { owner: string; repo: string };
  createStore: () => SubscriberStore;
  createEmailProvider: () => EmailProvider;
  createLLMProvider: () => LLMProvider;
  gatherActivity: typeof gatherActivity;
  generateEmailDraft: typeof generateEmailDraft;
  fromEmail: string;
  fromName: string;
  projectRoot: string;
}

// --- MCP Server Factory ---

export function createServer(deps: McpDeps): McpServer {
  const server = new McpServer({
    name: 'cryyer',
    version: '0.1.0',
  });

  // --- Tools ---

  server.tool(
    'list_drafts',
    'List open draft issues awaiting review',
    {},
    async () => {
      const { owner, repo } = deps.getCryyerRepo();

      const { data: issues } = await deps.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        labels: 'draft',
        per_page: 50,
        sort: 'created',
        direction: 'desc',
      });

      if (issues.length === 0) {
        return { content: [{ type: 'text', text: 'No open draft issues found.' }] };
      }

      const products = deps.getProducts();
      const lines = issues.map((issue) => {
        const labels = getLabelNames(issue);
        const productId = extractProductLabel(labels, products) ?? 'unknown';
        return `#${issue.number} — ${issue.title} [product: ${productId}]`;
      });

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    }
  );

  server.tool(
    'get_draft',
    'Get the full content of a draft issue',
    { issue_number: z.number().int().positive().describe('The GitHub issue number') },
    async ({ issue_number }) => {
      const { owner, repo } = deps.getCryyerRepo();

      const { data: issue } = await deps.octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      });

      const parsed = parseIssueBody(issue.body ?? '');
      if (!parsed) {
        return {
          content: [{ type: 'text', text: `Could not parse draft format from issue #${issue_number}. Expected: **Subject:** ...\n\n---\n\n<body>` }],
          isError: true,
        };
      }

      const labels = getLabelNames(issue);
      const products = deps.getProducts();
      const productId = extractProductLabel(labels, products);

      const audienceLabel = labels.find((l) => l.startsWith('audience:'));
      const audienceId = audienceLabel?.slice('audience:'.length);

      let subscriberInfo = '';
      if (productId) {
        try {
          const subKey = subscriberKey(productId, audienceId);
          const store = deps.createStore();
          const subscribers = await store.getSubscribers(subKey);
          subscriberInfo = `\n\nSubscribers: ${subscribers.length}`;
        } catch {
          subscriberInfo = '\n\nSubscribers: (unable to fetch)';
        }
      }

      const text = [
        `Issue: #${issue_number} — ${issue.title}`,
        `Product: ${productId ?? 'unknown'}`,
        `Status: ${issue.state}`,
        `Labels: ${labels.join(', ')}`,
        subscriberInfo ? `Subscribers: ${subscriberInfo.trim().replace('Subscribers: ', '')}` : '',
        '',
        `Subject: ${parsed.subject}`,
        '',
        '---',
        '',
        parsed.emailBody,
      ].filter((line) => line !== undefined).join('\n');

      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool(
    'update_draft',
    'Update the subject and body of a draft issue',
    {
      issue_number: z.number().int().positive().describe('The GitHub issue number'),
      subject: z.string().describe('The new email subject line'),
      body: z.string().describe('The new email body (markdown)'),
    },
    async ({ issue_number, subject, body }) => {
      const { owner, repo } = deps.getCryyerRepo();

      const issueBody = formatIssueBody(subject, body);
      await deps.octokit.rest.issues.update({
        owner,
        repo,
        issue_number,
        body: issueBody,
      });

      return {
        content: [{ type: 'text', text: `Updated issue #${issue_number} with new subject and body.` }],
      };
    }
  );

  server.tool(
    'send_draft',
    'Send the draft email to subscribers, close the issue, and add a sent label',
    { issue_number: z.number().int().positive().describe('The GitHub issue number') },
    async ({ issue_number }) => {
      const { owner, repo } = deps.getCryyerRepo();

      // Fetch issue
      const { data: issue } = await deps.octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      });

      const labels = getLabelNames(issue);

      // Check for already-sent
      if (labels.includes('sent')) {
        return {
          content: [{ type: 'text', text: `Issue #${issue_number} has already been sent. Aborting to prevent double-send.` }],
          isError: true,
        };
      }

      // Find product
      const products = deps.getProducts();
      const productId = extractProductLabel(labels, products);
      if (!productId) {
        return {
          content: [{ type: 'text', text: `No matching product label found on issue #${issue_number}.` }],
          isError: true,
        };
      }

      const product = products.find((p) => p.id === productId)!;

      // Parse email content
      const parsed = parseIssueBody(issue.body ?? '');
      if (!parsed) {
        return {
          content: [{ type: 'text', text: `Could not parse email subject/body from issue #${issue_number}.` }],
          isError: true,
        };
      }

      const emailContent = { subject: parsed.subject, body: parsed.emailBody };

      // Get subscribers (audience-aware)
      const audienceLabel = labels.find((l) => l.startsWith('audience:'));
      const audienceId = audienceLabel?.slice('audience:'.length);
      const subKey = subscriberKey(productId, audienceId);
      const store = deps.createStore();
      const subscribers = await store.getSubscribers(subKey);

      if (subscribers.length === 0) {
        return {
          content: [{ type: 'text', text: `No active subscribers found for ${product.name}. No emails sent.` }],
        };
      }

      // Adapt to BetaTester[]
      const betaTesters: BetaTester[] = subscribers.map((s, i) => ({
        id: String(i),
        email: s.email,
        name: s.name ?? '',
        productIds: [productId],
      }));

      // Send
      const emailProvider = deps.createEmailProvider();
      const stats = await sendEmails(
        emailProvider,
        product,
        betaTesters,
        emailContent,
        product.from_name ?? deps.fromName,
        product.from_email ?? deps.fromEmail,
        product.reply_to
      );

      // Add sent label and close
      await ensureLabel(deps.octokit, owner, repo, 'sent', '0e8a16');
      await deps.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: ['sent'],
      });

      await deps.octokit.rest.issues.update({
        owner,
        repo,
        issue_number,
        state: 'closed',
      });

      // Post stats comment
      const failureDetails =
        stats.failures.length > 0
          ? '\n\nFailures:\n' + stats.failures.map((f) => `- ${f.email}: ${f.error}`).join('\n')
          : '';

      const comment = `Email delivery complete for **${product.name}**.\n\n- Sent: ${stats.sent}\n- Failed: ${stats.failed}${failureDetails}`;

      await deps.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body: comment,
      });

      return {
        content: [{ type: 'text', text: `Sent ${stats.sent} emails for ${product.name}. ${stats.failed} failed. Issue #${issue_number} closed.` }],
      };
    }
  );

  server.tool(
    'regenerate_draft',
    'Re-gather GitHub activity and regenerate the draft using the LLM with the product voice',
    { issue_number: z.number().int().positive().describe('The GitHub issue number') },
    async ({ issue_number }) => {
      const { owner, repo } = deps.getCryyerRepo();

      const { data: issue } = await deps.octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      });

      const labels = getLabelNames(issue);
      const products = deps.getProducts();
      const productId = extractProductLabel(labels, products);

      if (!productId) {
        return {
          content: [{ type: 'text', text: `No matching product label found on issue #${issue_number}.` }],
          isError: true,
        };
      }

      const product = products.find((p) => p.id === productId)!;
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const weekOf = getWeekOf();

      // Detect audience from labels
      const audienceLabel = labels.find((l) => l.startsWith('audience:'));
      const audienceId = audienceLabel?.slice('audience:'.length);
      const audiences = resolveAudiences(product);
      const audience = audienceId ? audiences.find((a) => a.id === audienceId) : audiences[0];

      const activity = await deps.gatherActivity(deps.octokit, product, since);
      const llm = deps.createLLMProvider();
      const draft = await deps.generateEmailDraft(llm, product, activity, weekOf, undefined, audience);

      // Update issue body
      const issueBody = formatIssueBody(draft.subject, draft.body);
      await deps.octokit.rest.issues.update({
        owner,
        repo,
        issue_number,
        body: issueBody,
      });

      return {
        content: [{ type: 'text', text: `Regenerated draft for issue #${issue_number} (${product.name}).\n\nSubject: ${draft.subject}\n\n---\n\n${draft.body}` }],
      };
    }
  );

  server.tool(
    'list_products',
    'List configured products, their audiences, and subscriber counts',
    {},
    async () => {
      const products = deps.getProducts();
      const lines: string[] = [];

      for (const product of products) {
        const audiences = resolveAudiences(product);

        if (audiences.length === 1 && !audiences[0].id) {
          let count = '';
          try {
            const store = deps.createStore();
            const subscribers = await store.getSubscribers(product.id);
            count = ` (${subscribers.length} subscribers)`;
          } catch {
            count = '';
          }
          lines.push(`${product.id}: ${product.name}${count}`);
        } else {
          lines.push(`${product.id}: ${product.name}`);
          for (const audience of audiences) {
            const subKey = subscriberKey(product.id, audience.id);
            let count = '';
            try {
              const store = deps.createStore();
              const subscribers = await store.getSubscribers(subKey);
              count = ` (${subscribers.length} subscribers)`;
            } catch {
              count = '';
            }
            lines.push(`  audience: ${audience.id}${count}`);
          }
        }
      }

      return {
        content: [{ type: 'text', text: lines.length > 0 ? lines.join('\n') : 'No products configured.' }],
      };
    }
  );

  server.tool(
    'list_subscribers',
    'List subscribers for a product (optionally filtered by audience)',
    {
      product_id: z.string().describe('The product ID'),
      audience_id: z.string().optional().describe('Optional audience ID for multi-audience products'),
    },
    async ({ product_id, audience_id }) => {
      const subKey = subscriberKey(product_id, audience_id);
      const store = deps.createStore();
      const subscribers = await store.getSubscribers(subKey);

      if (subscribers.length === 0) {
        return {
          content: [{ type: 'text', text: `No subscribers found for: ${subKey}` }],
        };
      }

      const lines = subscribers.map((s) =>
        s.name ? `${s.email} (${s.name})` : s.email
      );

      return {
        content: [{ type: 'text', text: `${subscribers.length} subscribers for ${subKey}:\n\n${lines.join('\n')}` }],
      };
    }
  );

  server.tool(
    'add_subscriber',
    'Add a subscriber to a product (optionally to a specific audience)',
    {
      product_id: z.string().describe('The product ID'),
      email: z.string().email().describe('Subscriber email address'),
      name: z.string().optional().describe('Subscriber name (optional)'),
      audience_id: z.string().optional().describe('Optional audience ID for multi-audience products'),
    },
    async ({ product_id, email, name, audience_id }) => {
      const subKey = subscriberKey(product_id, audience_id);
      const store = deps.createStore();
      await store.addSubscriber(subKey, email, name);

      return {
        content: [{ type: 'text', text: `Added ${email} to ${subKey}.` }],
      };
    }
  );

  server.tool(
    'remove_subscriber',
    'Remove or unsubscribe someone from a product (optionally from a specific audience)',
    {
      product_id: z.string().describe('The product ID'),
      email: z.string().email().describe('Subscriber email address'),
      audience_id: z.string().optional().describe('Optional audience ID for multi-audience products'),
    },
    async ({ product_id, email, audience_id }) => {
      const subKey = subscriberKey(product_id, audience_id);
      const store = deps.createStore();
      await store.removeSubscriber(subKey, email);

      return {
        content: [{ type: 'text', text: `Removed ${email} from ${subKey}.` }],
      };
    }
  );

  // --- Social tools ---

  server.tool(
    'social_add_seed',
    'Append a content seed to a product\'s seeds file',
    {
      product_id: z.string().describe('The product ID'),
      type: z.enum(['pain', 'insight', 'capability', 'proof', 'update', 'blog']).describe('Content type'),
      text: z.string().describe('The seed text'),
    },
    async ({ product_id, type, text }) => {
      const seedsDir = join(deps.projectRoot, 'seeds');
      const filePath = appendSeed(seedsDir, product_id, type as ContentType, text);
      return {
        content: [{ type: 'text', text: `Added ${type} seed to ${filePath}` }],
      };
    }
  );

  server.tool(
    'social_draft',
    'Generate social posts from seeds for a product',
    {
      product_id: z.string().describe('The product ID'),
      content_type: z.enum(['pain', 'insight', 'capability', 'proof', 'update', 'blog']).optional().describe('Filter seeds by content type'),
    },
    async ({ product_id, content_type }) => {
      const products = deps.getProducts();
      const product = products.find((p) => p.id === product_id);
      if (!product) {
        return {
          content: [{ type: 'text', text: `Product not found: ${product_id}. Available: ${products.map((p) => p.id).join(', ')}` }],
          isError: true,
        };
      }

      if (!product.social?.platforms?.length) {
        return {
          content: [{ type: 'text', text: `Product "${product_id}" has no social.platforms configured` }],
          isError: true,
        };
      }

      const allPlatforms = loadPlatforms(join(deps.projectRoot, 'platforms'));
      const platforms = allPlatforms.filter((p) =>
        product.social!.platforms.includes(p.id),
      );
      if (platforms.length === 0) {
        return {
          content: [{ type: 'text', text: `No matching platform configs found for: ${product.social.platforms.join(', ')}` }],
          isError: true,
        };
      }

      const seedsFile = join(deps.projectRoot, 'seeds', `${product_id}.md`);
      if (!existsSync(seedsFile)) {
        return {
          content: [{ type: 'text', text: `No seeds file found at ${seedsFile}. Use social_add_seed to add seeds first.` }],
          isError: true,
        };
      }

      let seeds = parseSeeds(seedsFile);
      if (content_type) {
        seeds = seeds.filter((s) => s.type === content_type);
        if (seeds.length === 0) {
          return {
            content: [{ type: 'text', text: `No seeds found with type "${content_type}" in ${seedsFile}` }],
            isError: true,
          };
        }
      }

      // Gather activity for update-type seeds
      let activity;
      const hasUpdateSeeds = seeds.some((s) => s.type === 'update');
      if (hasUpdateSeeds && product.repo) {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        activity = await deps.gatherActivity(deps.octokit, product, since);
      }

      const llm = deps.createLLMProvider();
      const posts = await generateSocialPosts(llm, product, seeds, platforms, activity);

      const draft: SocialDraft = {
        product: product_id,
        generatedAt: new Date().toISOString(),
        seeds: seeds.length,
        posts,
      };

      const outputDir = join(deps.projectRoot, 'social-drafts');
      const filePath = writeSocialDraft(draft, outputDir);

      const summary = posts.map((p) => `- ${p.seed.type} | ${p.platform.id}: ${p.text.slice(0, 80)}...`).join('\n');
      return {
        content: [{ type: 'text', text: `Generated ${posts.length} posts, saved to ${filePath}\n\n${summary}` }],
      };
    }
  );

  server.tool(
    'social_list_drafts',
    'List generated social draft files in social-drafts/',
    {},
    async () => {
      const draftsDir = join(deps.projectRoot, 'social-drafts');
      if (!existsSync(draftsDir)) {
        return { content: [{ type: 'text', text: 'No social-drafts/ directory found.' }] };
      }

      const files = readdirSync(draftsDir)
        .filter((f) => f.endsWith('.md'))
        .sort()
        .reverse();

      if (files.length === 0) {
        return { content: [{ type: 'text', text: 'No social draft files found.' }] };
      }

      return {
        content: [{ type: 'text', text: files.join('\n') }],
      };
    }
  );

  server.tool(
    'social_get_draft',
    'Read a social draft file and display its contents',
    {
      filename: z.string().describe('The draft filename (e.g. "cryyer-2026-03-25.md")'),
    },
    async ({ filename }) => {
      const filePath = join(deps.projectRoot, 'social-drafts', filename);
      if (!existsSync(filePath)) {
        return {
          content: [{ type: 'text', text: `Draft file not found: ${filePath}` }],
          isError: true,
        };
      }

      const draft = readSocialDraft(filePath);
      const lines: string[] = [
        `Product: ${draft.product}`,
        `Generated: ${draft.generatedAt}`,
        `Seeds: ${draft.seeds}`,
        `Posts: ${draft.posts.length}`,
        '',
      ];

      for (const post of draft.posts) {
        lines.push(`--- ${post.seed.type} | ${post.platform.id} ---`);
        lines.push(post.text);
        lines.push('');
      }

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    }
  );

  server.tool(
    'social_send',
    'Send a social draft to Buffer for publishing',
    {
      filename: z.string().describe('The draft filename (e.g. "cryyer-2026-03-25.md")'),
      dry_run: z.boolean().optional().describe('Preview without sending to Buffer'),
    },
    async ({ filename, dry_run }) => {
      const filePath = join(deps.projectRoot, 'social-drafts', filename);
      if (!existsSync(filePath)) {
        return {
          content: [{ type: 'text', text: `Draft file not found: ${filePath}` }],
          isError: true,
        };
      }

      const draft = readSocialDraft(filePath);
      const platformEnvMap: Record<string, string> = {
        twitter: 'BUFFER_PROFILE_TWITTER',
        linkedin: 'BUFFER_PROFILE_LINKEDIN',
        bluesky: 'BUFFER_PROFILE_BLUESKY',
      };

      if (dry_run) {
        const lines = draft.posts.map(
          (p) => `[DRY RUN] ${p.platform.id}: ${p.text.slice(0, 100)}...`,
        );
        return {
          content: [{ type: 'text', text: `${lines.join('\n')}\n\n${draft.posts.length} posts (dry run)` }],
        };
      }

      const token = process.env['BUFFER_ACCESS_TOKEN'];
      if (!token) {
        return {
          content: [{ type: 'text', text: 'Missing BUFFER_ACCESS_TOKEN environment variable' }],
          isError: true,
        };
      }

      const profiles = await bufferProvider.listProfiles(token);
      const profileMap = new Map<string, string>();
      for (const [platformId, envVar] of Object.entries(platformEnvMap)) {
        const envProfileId = process.env[envVar];
        if (envProfileId) {
          const found = profiles.find((p) => p.id === envProfileId);
          if (!found) {
            console.error(`Warning: ${envVar}=${envProfileId} not found in Buffer profiles`);
          }
          profileMap.set(platformId, envProfileId);
        }
      }

      let queued = 0;
      const skipped: string[] = [];

      for (const post of draft.posts) {
        const profileId = profileMap.get(post.platform.id);
        if (!profileId) {
          skipped.push(post.platform.id);
          continue;
        }
        await bufferProvider.createPost(token, profileId, post.text);
        queued++;
      }

      let result = `Queued ${queued} of ${draft.posts.length} posts to Buffer.`;
      if (skipped.length > 0) {
        const unique = [...new Set(skipped)];
        result += ` Skipped platforms (no profile configured): ${unique.join(', ')}`;
      }

      return {
        content: [{ type: 'text', text: result }],
      };
    }
  );

  // --- Prompts ---

  server.prompt(
    'review_drafts',
    'Review, edit, and send all pending drafts',
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Time to review the drafts! Please:',
              '',
              '1. List all pending drafts using list_drafts',
              '2. For each draft, use get_draft to show me the full content and subscriber count',
              '3. For each one, ask me whether I want to:',
              '   - **Send** it as-is',
              '   - **Edit** it (I\'ll tell you what to change, then you use update_draft)',
              '   - **Regenerate** it from scratch with regenerate_draft',
              '   - **Skip** it for now',
              '',
              'Walk me through them one at a time.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  return server;
}

// --- Default deps from environment ---

function defaultDeps(): McpDeps {
  const projectRoot = process.env['CRYYER_ROOT'] ?? process.cwd();
  const githubToken = requireEnv('GITHUB_TOKEN');
  const fromEmail = requireEnv('FROM_EMAIL');
  const fromName = process.env['FROM_NAME'] ?? 'Cryyer Updates';

  return {
    octokit: new Octokit({ auth: githubToken }),
    getProducts: () => loadProducts(join(projectRoot, 'products')),
    getCryyerRepo,
    createStore: createSubscriberStore,
    createEmailProvider,
    createLLMProvider,
    gatherActivity,
    generateEmailDraft,
    fromEmail,
    fromName,
    projectRoot,
  };
}

// --- Start ---

async function main(): Promise<void> {
  // Protect stdout — MCP uses JSON-RPC over stdio.
  console.log = console.error;
  console.warn = console.error;

  const deps = defaultDeps();
  const server = createServer(deps);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cryyer MCP server running on stdio');
}

// Only auto-run when executed directly (not when imported for testing)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
