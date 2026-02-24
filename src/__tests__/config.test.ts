import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { loadProducts } from '../config.js';

describe('loadProducts', () => {
  const productsDir = join(process.cwd(), 'products');

  it('loads all YAML product files', () => {
    const products = loadProducts(productsDir);
    expect(products.length).toBeGreaterThanOrEqual(2);
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
      expect(product.voice.length).toBeGreaterThan(0);
    }
  });

  it('throws on non-existent directory', () => {
    expect(() => loadProducts('/tmp/nonexistent-cryer-dir')).toThrow();
  });
});
