import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { loadProducts, validateProduct } from '../config.js';
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
