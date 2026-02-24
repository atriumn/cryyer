import { describe, it, expect, afterEach } from 'vitest';
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
});
