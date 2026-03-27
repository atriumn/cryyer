import { describe, it, expect } from 'vitest';
import { parseArgv, generateSlug, extractTitle, buildFrontmatter } from '../social/blog-publish.js';

describe('blog-publish parseArgv', () => {
  it('parses positional draft path and --product flag', () => {
    const result = parseArgv(['social-drafts/noxaudit-2026-03-27.md', '--product', 'noxaudit']);
    expect(result.draftPath).toBe('social-drafts/noxaudit-2026-03-27.md');
    expect(result.productId).toBe('noxaudit');
    expect(result.dryRun).toBe(false);
  });

  it('parses --dry-run flag', () => {
    const result = parseArgv(['draft.md', '--product', 'noxaudit', '--dry-run']);
    expect(result.dryRun).toBe(true);
  });

  it('parses --config-dir flag', () => {
    const result = parseArgv(['draft.md', '--product', 'noxaudit', '--config-dir', '/custom']);
    expect(result.configDir).toBe('/custom');
  });

  it('strips leading "blog-publish" command word', () => {
    const result = parseArgv(['blog-publish', 'draft.md', '--product', 'noxaudit']);
    expect(result.draftPath).toBe('draft.md');
    expect(result.productId).toBe('noxaudit');
  });

  it('throws when draft path is missing', () => {
    expect(() => parseArgv(['--product', 'noxaudit'])).toThrow('Missing <path>');
  });

  it('throws when --product is missing', () => {
    expect(() => parseArgv(['draft.md'])).toThrow('Missing --product');
  });
});

describe('generateSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(generateSlug('Why We Rotate LLM Providers')).toBe('why-we-rotate-llm-providers');
  });

  it('strips special characters', () => {
    expect(generateSlug('Hello, World! (2026)')).toBe('hello-world-2026');
  });

  it('collapses multiple hyphens', () => {
    expect(generateSlug('foo  --  bar')).toBe('foo-bar');
  });
});

describe('extractTitle', () => {
  it('extracts h1 heading from content', () => {
    const content = '# Why We Rotate LLM Providers\n\nBody text here.';
    expect(extractTitle(content)).toBe('Why We Rotate LLM Providers');
  });

  it('returns "untitled" when no h1 heading', () => {
    expect(extractTitle('Just some text without a heading.')).toBe('untitled');
  });
});

describe('buildFrontmatter', () => {
  const vars = { title: 'My Post', date: '2026-03-27', excerpt: 'Short excerpt' };

  it('substitutes {{variable}} placeholders', () => {
    const template = { title: '"{{title}}"', date: '"{{date}}"', excerpt: '"{{excerpt}}"' };
    const result = buildFrontmatter(template, vars);
    expect(result).toContain('title: "My Post"');
    expect(result).toContain('date: "2026-03-27"');
    expect(result).toContain('excerpt: "Short excerpt"');
  });

  it('falls back to title/date when no template', () => {
    const result = buildFrontmatter(undefined, vars);
    expect(result).toContain('title: "My Post"');
    expect(result).toContain('date: "2026-03-27"');
  });
});
