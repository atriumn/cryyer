import { describe, it, expect } from 'vitest';
import { resolveAudiences, subscriberKey } from '../types.js';
import type { Product } from '../types.js';

describe('resolveAudiences', () => {
  it('returns synthetic single audience for legacy product', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      voice: 'friendly',
      emailSubjectTemplate: '{{weekOf}} Update',
      repo: 'owner/repo',
      from_name: 'Test Team',
      from_email: 'test@example.com',
      reply_to: 'reply@example.com',
    };

    const audiences = resolveAudiences(product);
    expect(audiences).toHaveLength(1);
    expect(audiences[0].id).toBeUndefined();
    expect(audiences[0].voice).toBe('friendly');
    expect(audiences[0].emailSubjectTemplate).toBe('{{weekOf}} Update');
    expect(audiences[0].from_name).toBe('Test Team');
    expect(audiences[0].from_email).toBe('test@example.com');
    expect(audiences[0].reply_to).toBe('reply@example.com');
  });

  it('returns audience array for multi-audience product', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      repo: 'owner/repo',
      audiences: [
        { id: 'beta', voice: 'casual', emailSubjectTemplate: 'Beta {{weekOf}}' },
        { id: 'enterprise', voice: 'formal', emailSubjectTemplate: 'Release {{weekOf}}' },
      ],
    };

    const audiences = resolveAudiences(product);
    expect(audiences).toHaveLength(2);
    expect(audiences[0].id).toBe('beta');
    expect(audiences[0].voice).toBe('casual');
    expect(audiences[1].id).toBe('enterprise');
    expect(audiences[1].voice).toBe('formal');
  });

  it('inherits product-level from_name/from_email/reply_to when not set on audience', () => {
    const product: Product = {
      id: 'test',
      name: 'Test',
      repo: 'owner/repo',
      from_name: 'Product Team',
      from_email: 'product@example.com',
      reply_to: 'reply@example.com',
      audiences: [
        { id: 'beta', voice: 'casual', emailSubjectTemplate: 'Beta {{weekOf}}' },
        {
          id: 'enterprise',
          voice: 'formal',
          emailSubjectTemplate: 'Release {{weekOf}}',
          from_name: 'Enterprise Team',
        },
      ],
    };

    const audiences = resolveAudiences(product);
    expect(audiences[0].from_name).toBe('Product Team');
    expect(audiences[0].from_email).toBe('product@example.com');
    expect(audiences[0].reply_to).toBe('reply@example.com');
    expect(audiences[1].from_name).toBe('Enterprise Team');
    expect(audiences[1].from_email).toBe('product@example.com');
  });
});

describe('subscriberKey', () => {
  it('returns productId when no audienceId', () => {
    expect(subscriberKey('myapp')).toBe('myapp');
    expect(subscriberKey('myapp', undefined)).toBe('myapp');
  });

  it('returns compound key when audienceId is set', () => {
    expect(subscriberKey('myapp', 'beta')).toBe('myapp:beta');
    expect(subscriberKey('myapp', 'enterprise')).toBe('myapp:enterprise');
  });
});
