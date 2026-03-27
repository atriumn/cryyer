import { describe, it, expect } from 'vitest';
import { parseArgv, generateSlug, extractTitle, buildFrontmatter, extractExcerpt } from '../social/blog-publish.js';

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

  it('strips leading "publish" command word', () => {
    const result = parseArgv(['publish', 'draft.md', '--product', 'noxaudit']);
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

describe('extractExcerpt', () => {
  it('strips heading and returns first 160 chars of body', () => {
    const content = '# My Post\n\nThis is the body text of the post.';
    const result = extractExcerpt(content);
    expect(result).toBe('This is the body text of the post.');
    expect(result.length).toBeLessThanOrEqual(160);
  });

  it('strips markdown bold and italic syntax', () => {
    const content = '# Title\n\n**Bold text** and *italic text* here.';
    expect(extractExcerpt(content)).toBe('Bold text and italic text here.');
  });

  it('strips markdown link syntax', () => {
    const content = '# Title\n\nCheck out [this link](https://example.com) for more.';
    expect(extractExcerpt(content)).toBe('Check out this link for more.');
  });

  it('truncates to 160 characters', () => {
    const longBody = 'a'.repeat(200);
    const content = `# Title\n\n${longBody}`;
    expect(extractExcerpt(content).length).toBe(160);
  });

  it('collapses newlines into spaces', () => {
    const content = '# Title\n\nFirst line.\nSecond line.\nThird line.';
    expect(extractExcerpt(content)).toBe('First line. Second line. Third line.');
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
