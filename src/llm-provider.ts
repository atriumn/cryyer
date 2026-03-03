export interface LLMProvider {
  generate(prompt: string, maxTokens: number): Promise<string>;
}

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'claude-sonnet-4-5-20250514';
  }

  async generate(prompt: string, maxTokens: number): Promise<string> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: this.apiKey });

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
      const apiKey = overrides?.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY environment variable');
      return new AnthropicProvider(apiKey, model);
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
