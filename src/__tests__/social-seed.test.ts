import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { parseArgv, appendSeed } from '../social/seed.js';

const TMP_DIR = join(process.cwd(), '.tmp-test-social-seed');

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('parseArgv', () => {
  it('parses productId, type, and text from positional args', () => {
    const result = parseArgv(['noxaudit', 'pain', 'devs ignore drift']);
    expect(result).toEqual({
      productId: 'noxaudit',
      type: 'pain',
      text: 'devs ignore drift',
    });
  });

  it('joins multi-word text arguments', () => {
    const result = parseArgv(['noxaudit', 'insight', 'multi', 'word', 'text']);
    expect(result.text).toBe('multi word text');
  });

  it('strips leading "seed" command word', () => {
    const result = parseArgv(['seed', 'noxaudit', 'pain', 'some text']);
    expect(result.productId).toBe('noxaudit');
    expect(result.type).toBe('pain');
  });

  it('throws on too few arguments', () => {
    expect(() => parseArgv(['noxaudit', 'pain'])).toThrow('Usage:');
  });

  it('throws on unknown content type', () => {
    expect(() => parseArgv(['noxaudit', 'rant', 'text'])).toThrow(
      'Unknown content type: "rant"',
    );
  });
});

describe('appendSeed', () => {
  it('creates a new file when none exists', () => {
    const filePath = appendSeed(TMP_DIR, 'testprod', 'pain', 'first seed');
    expect(filePath).toBe(join(TMP_DIR, 'testprod.md'));
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toBe('## pain\nfirst seed\n');
  });

  it('appends under existing heading', () => {
    const seedsDir = TMP_DIR;
    mkdirSync(seedsDir, { recursive: true });
    writeFileSync(join(seedsDir, 'testprod.md'), '## pain\nfirst seed\n', 'utf-8');

    appendSeed(seedsDir, 'testprod', 'pain', 'second seed');
    const content = readFileSync(join(seedsDir, 'testprod.md'), 'utf-8');
    expect(content).toContain('## pain');
    expect(content).toContain('first seed');
    expect(content).toContain('second seed');
    // Both seeds should be under the same heading
    const headingCount = (content.match(/## pain/g) ?? []).length;
    expect(headingCount).toBe(1);
  });

  it('adds a new heading when type does not exist', () => {
    const seedsDir = TMP_DIR;
    mkdirSync(seedsDir, { recursive: true });
    writeFileSync(join(seedsDir, 'testprod.md'), '## pain\nexisting\n', 'utf-8');

    appendSeed(seedsDir, 'testprod', 'insight', 'new insight');
    const content = readFileSync(join(seedsDir, 'testprod.md'), 'utf-8');
    expect(content).toContain('## pain');
    expect(content).toContain('## insight');
    expect(content).toContain('new insight');
  });

  it('appends between existing headings correctly', () => {
    const seedsDir = TMP_DIR;
    mkdirSync(seedsDir, { recursive: true });
    writeFileSync(
      join(seedsDir, 'testprod.md'),
      '## pain\npain seed\n\n## insight\ninsight seed\n',
      'utf-8',
    );

    appendSeed(seedsDir, 'testprod', 'pain', 'another pain');
    const content = readFileSync(join(seedsDir, 'testprod.md'), 'utf-8');

    // "another pain" should appear before "## insight"
    const painPos = content.indexOf('another pain');
    const insightHeadingPos = content.indexOf('## insight');
    expect(painPos).toBeLessThan(insightHeadingPos);
  });
});
