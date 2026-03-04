import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"subject":"S","body":"B"}' }],
      }),
    };
  },
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{"subject":"S","body":"B"}' } }],
        }),
      },
    };
  },
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleAI {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => '{"subject":"S","body":"B"}' },
        }),
      };
    }
  },
}));

import { createLLMProvider, AnthropicProvider, OpenAIProvider, GeminiProvider } from '../llm-provider.js';

describe('createLLMProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to anthropic when LLM_PROVIDER is not set', () => {
    delete process.env.LLM_PROVIDER;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('creates AnthropicProvider when LLM_PROVIDER=anthropic', () => {
    process.env.LLM_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('creates OpenAIProvider when LLM_PROVIDER=openai', () => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('creates GeminiProvider when LLM_PROVIDER=gemini', () => {
    process.env.LLM_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it('throws on unknown provider', () => {
    process.env.LLM_PROVIDER = 'unknown';
    expect(() => createLLMProvider()).toThrow('Unknown LLM provider: unknown');
  });

  it('throws when API key is missing for anthropic', () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.LLM_PROVIDER = 'anthropic';
    expect(() => createLLMProvider()).toThrow('Missing ANTHROPIC_API_KEY');
  });

  it('throws when API key is missing for openai', () => {
    delete process.env.OPENAI_API_KEY;
    process.env.LLM_PROVIDER = 'openai';
    expect(() => createLLMProvider()).toThrow('Missing OPENAI_API_KEY');
  });

  it('throws when API key is missing for gemini', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.LLM_PROVIDER = 'gemini';
    expect(() => createLLMProvider()).toThrow('Missing GEMINI_API_KEY');
  });

  it('accepts overrides for provider and apiKey', () => {
    const provider = createLLMProvider({ provider: 'openai', apiKey: 'override-key' });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('overrides take precedence over env vars', () => {
    process.env.LLM_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'env-key';
    const provider = createLLMProvider({ provider: 'openai', apiKey: 'override-key' });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('accepts model override', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const provider = createLLMProvider({ provider: 'anthropic', model: 'claude-haiku-3-5' });
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('uses LLM_MODEL env var when set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.LLM_MODEL = 'claude-haiku-3-5';
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });
});

describe('AnthropicProvider.generate', () => {
  it('calls Anthropic API and returns text', async () => {
    const provider = new AnthropicProvider('test-key');
    const result = await provider.generate('test prompt', 1024);
    expect(result).toBe('{"subject":"S","body":"B"}');
  });
});

describe('OpenAIProvider.generate', () => {
  it('calls OpenAI API and returns text', async () => {
    const provider = new OpenAIProvider('test-key');
    const result = await provider.generate('test prompt', 1024);
    expect(result).toBe('{"subject":"S","body":"B"}');
  });
});

describe('GeminiProvider.generate', () => {
  it('calls Gemini API and returns text', async () => {
    const provider = new GeminiProvider('test-key');
    const result = await provider.generate('test prompt', 1024);
    expect(result).toBe('{"subject":"S","body":"B"}');
  });
});
