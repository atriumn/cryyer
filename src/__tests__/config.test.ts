import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
import { loadProducts, validateProduct, loadConfig } from '../config.js';
import type { Product } from '../types.js';

describe('loadProducts', () => {
  const productsDir = join(process.cwd(), 'products');

  it('loads all YAML product files', () => {
    const products = loadProducts(productsDir);
    expect(products.length).toBeGreaterThanOrEqual(1);
  });

  it('parses product fields correctly', () => {
    const products = loadProducts(productsDir);
    for (const product of products) {
      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(typeof product.id).toBe('string');
      expect(typeof product.name).toBe('string');
    }
  });

  it('loads voice field as string', () => {
    const products = loadProducts(productsDir);
    const withVoice = products.filter((p) => p.voice);
    expect(withVoice.length).toBeGreaterThan(0);
    for (const product of withVoice) {
      expect(typeof product.voice).toBe('string');
      expect(product.voice!.length).toBeGreaterThan(0);
    }
  });

  it('throws on non-existent directory', () => {
    expect(() => loadProducts('/tmp/nonexistent-cryyer-dir')).toThrow();
  });
});

describe('validateProduct', () => {
  it('passes for legacy product with voice and emailSubjectTemplate', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      voice: 'friendly',
      emailSubjectTemplate: '{{weekOf}} Update',
      repo: 'owner/repo',
    };
    expect(() => validateProduct(product, 'test.yaml')).not.toThrow();
  });

  it('passes for product with valid audiences', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      repo: 'owner/repo',
      audiences: [
        { id: 'beta', voice: 'casual', emailSubjectTemplate: 'Beta {{weekOf}}' },
      ],
    };
    expect(() => validateProduct(product, 'test.yaml')).not.toThrow();
  });

  it('throws when voice is missing and no audiences', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      emailSubjectTemplate: '{{weekOf}} Update',
      repo: 'owner/repo',
    };
    expect(() => validateProduct(product, 'test.yaml')).toThrow('missing "voice"');
  });

  it('throws when emailSubjectTemplate is missing and no audiences', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      voice: 'friendly',
      repo: 'owner/repo',
    };
    expect(() => validateProduct(product, 'test.yaml')).toThrow('missing "emailSubjectTemplate"');
  });

  it('throws when audience is missing id', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      repo: 'owner/repo',
      audiences: [
        { id: '', voice: 'casual', emailSubjectTemplate: 'Beta' },
      ],
    };
    expect(() => validateProduct(product, 'test.yaml')).toThrow('audience missing "id"');
  });

  it('throws when audience is missing voice', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      repo: 'owner/repo',
      audiences: [
        { id: 'beta', voice: '', emailSubjectTemplate: 'Beta' },
      ],
    };
    expect(() => validateProduct(product, 'test.yaml')).toThrow('missing "voice"');
  });

  it('throws when audience is missing emailSubjectTemplate', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      repo: 'owner/repo',
      audiences: [
        { id: 'beta', voice: 'casual', emailSubjectTemplate: '' },
      ],
    };
    expect(() => validateProduct(product, 'test.yaml')).toThrow('missing "emailSubjectTemplate"');
  });
});

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads config from environment variables', () => {
    process.env['GITHUB_TOKEN'] = 'ghp_test';
    process.env['RESEND_API_KEY'] = 're_test';
    process.env['FROM_EMAIL'] = 'from@test.com';
    const config = loadConfig();
    expect(config.githubToken).toBe('ghp_test');
    expect(config.resendApiKey).toBe('re_test');
    expect(config.fromEmail).toBe('from@test.com');
  });

  it('throws when GITHUB_TOKEN is missing', () => {
    delete process.env['GITHUB_TOKEN'];
    process.env['RESEND_API_KEY'] = 're_test';
    process.env['FROM_EMAIL'] = 'from@test.com';
    expect(() => loadConfig()).toThrow('GITHUB_TOKEN');
  });

  it('throws when RESEND_API_KEY is missing', () => {
    process.env['GITHUB_TOKEN'] = 'ghp_test';
    delete process.env['RESEND_API_KEY'];
    process.env['FROM_EMAIL'] = 'from@test.com';
    expect(() => loadConfig()).toThrow('RESEND_API_KEY');
  });

  it('throws when FROM_EMAIL is missing', () => {
    process.env['GITHUB_TOKEN'] = 'ghp_test';
    process.env['RESEND_API_KEY'] = 're_test';
    delete process.env['FROM_EMAIL'];
    expect(() => loadConfig()).toThrow('FROM_EMAIL');
  });
});
