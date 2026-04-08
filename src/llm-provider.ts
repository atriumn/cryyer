import { readFileSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';

export interface LLMProvider {
  generate(prompt: string, maxTokens: number): Promise<string>;
}

function readClaudeOAuthToken(): string | null {
  try {
    const credPath = resolve(homedir(), '.claude', '.credentials.json');
    const raw = readFileSync(credPath, 'utf-8');
    const creds = JSON.parse(raw);
    return creds?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

export class AnthropicProvider implements LLMProvider {
  private apiKey: string | null;
  private useOAuth: boolean;
  private model: string;

  constructor(apiKey: string | null, model?: string, useOAuth?: boolean) {
    this.apiKey = apiKey;
    this.useOAuth = useOAuth ?? false;
    this.model = model || 'claude-sonnet-4-6';
  }

  async generate(prompt: string, maxTokens: number): Promise<string> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');

    let client: InstanceType<typeof Anthropic>;
    if (this.apiKey) {
      client = new Anthropic({ apiKey: this.apiKey });
    } else if (this.useOAuth) {
      // Re-read token on every call — Claude Code keeps it refreshed
      const oauthToken = readClaudeOAuthToken();
      if (!oauthToken) {
        throw new Error(
          'Claude OAuth token not found. Ensure Claude Code is running and ~/.claude/.credentials.json exists.'
        );
      }
      client = new Anthropic({
        authToken: oauthToken,
        apiKey: null,
        defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
      });
    } else {
      throw new Error('No Anthropic API key or OAuth token available');
    }

    const message = await client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic API');
    }
    return content.text;
  }
}

const CLAUDE_CLI = process.env.CLAUDE_CLI_PATH || 'claude';
/** Models supported directly via OAuth (Haiku tier) */
const OAUTH_DIRECT_MODELS = new Set(['claude-haiku-4-5']);

export class ClaudeCLIProvider implements LLMProvider {
  private model: string;

  constructor(model?: string) {
    this.model = model || 'claude-opus-4-6';
  }

  async generate(prompt: string, _maxTokens: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(CLAUDE_CLI, [
        '-p', '--model', this.model, '--output-format', 'json', '--dangerously-skip-permissions',
      ], {
        env: { ...process.env, ANTHROPIC_API_KEY: '' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d: Buffer) => { stdout += d; });
      proc.stderr.on('data', (d: Buffer) => { stderr += d; });
      proc.stdin.write(prompt);
      proc.stdin.end();

      const timer = setTimeout(() => { proc.kill(); reject(new Error('claude CLI timeout (5m)')); }, 300_000);
      proc.on('close', (code: number) => {
        clearTimeout(timer);
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(`claude CLI exited ${code}: ${stderr.slice(0, 300)}`));
          return;
        }
        try {
          const envelope = JSON.parse(stdout.trim());
          resolve(envelope.result || stdout);
        } catch {
          resolve(stdout);
        }
      });
      proc.on('error', (err: Error) => { clearTimeout(timer); reject(err); });
    });
  }
}

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o';
  }

  async generate(prompt: string, maxTokens: number): Promise<string> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.apiKey });

    const response = await client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('Unexpected response from OpenAI API');
    }
    return text;
  }
}

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'gemini-1.5-flash';
  }

  async generate(prompt: string, maxTokens: number): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(this.apiKey);

    const genModel = client.getGenerativeModel({
      model: this.model,
      generationConfig: { maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
    });
    const result = await genModel.generateContent(prompt);
    const text = result.response.text();
    if (!text) {
      throw new Error('Unexpected response from Gemini API');
    }
    return text;
  }
}

export type LLMProviderType = 'anthropic' | 'openai' | 'gemini';

export function createLLMProvider(overrides?: {
  provider?: LLMProviderType;
  model?: string;
  apiKey?: string;
}): LLMProvider {
  const providerName = (overrides?.provider || process.env.LLM_PROVIDER || 'anthropic') as LLMProviderType;
  const model = overrides?.model || process.env.LLM_MODEL || undefined;

  switch (providerName) {
    case 'anthropic': {
      const apiKey = overrides?.apiKey || process.env.ANTHROPIC_API_KEY || null;
      const effectiveModel = model || 'claude-opus-4-6';
      if (apiKey) {
        return new AnthropicProvider(apiKey, effectiveModel, false);
      }
      // No API key — use OAuth direct for Haiku, CLI for everything else
      if (OAUTH_DIRECT_MODELS.has(effectiveModel)) {
        if (!readClaudeOAuthToken()) {
          throw new Error('No Claude OAuth credentials found at ~/.claude/.credentials.json');
        }
        return new AnthropicProvider(null, effectiveModel, true);
      }
      // Opus/Sonnet: spawn the claude CLI (uses Claude Code's own auth)
      return new ClaudeCLIProvider(effectiveModel);
    }
    case 'openai': {
      const apiKey = overrides?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
      return new OpenAIProvider(apiKey, model);
    }
    case 'gemini': {
      const apiKey = overrides?.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');
      return new GeminiProvider(apiKey, model);
    }
    default:
      throw new Error(`Unknown LLM provider: ${providerName}. Supported: anthropic, openai, gemini`);
  }
}
