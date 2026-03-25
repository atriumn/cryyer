import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { parseSeeds } from '../social/parse-seeds.js';

const TMP_DIR = join(process.cwd(), '.tmp-test-seeds');

function seedFile(name: string, content: string): string {
  mkdirSync(TMP_DIR, { recursive: true });
  const path = join(TMP_DIR, name);
  writeFileSync(path, content, 'utf-8');
  return path;
}

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('parseSeeds', () => {
  it('parses a valid seed file with one seed per type', () => {
    const path = seedFile('valid.md', [
      '## pain',
      'most devs run linters but never catch architectural drift',
      '',
      '## insight',
      'we rotate between claude, gpt-4, and gemini because each catches different things',
    ].join('\n'));

    const seeds = parseSeeds(path);
    expect(seeds).toHaveLength(2);
    expect(seeds[0]).toEqual({
      type: 'pain',
      text: 'most devs run linters but never catch architectural drift',
    });
    expect(seeds[1]).toEqual({
      type: 'insight',
      text: 'we rotate between claude, gpt-4, and gemini because each catches different things',
    });
  });

  it('parses multiple seeds per type (separated by blank lines)', () => {
    const path = seedFile('multi.md', [
      '## pain',
      'first pain point',
      '',
      'second pain point',
      '',
      '## capability',
      'a capability seed',
    ].join('\n'));

    const seeds = parseSeeds(path);
    expect(seeds).toHaveLength(3);
    expect(seeds[0]).toEqual({ type: 'pain', text: 'first pain point' });
    expect(seeds[1]).toEqual({ type: 'pain', text: 'second pain point' });
    expect(seeds[2]).toEqual({ type: 'capability', text: 'a capability seed' });
  });

  it('throws on unknown content type', () => {
    const path = seedFile('unknown.md', [
      '## rant',
      'this should fail',
    ].join('\n'));

    expect(() => parseSeeds(path)).toThrow('Unknown content type: "rant"');
  });

  it('returns empty array for an empty file', () => {
    const path = seedFile('empty.md', '');
    const seeds = parseSeeds(path);
    expect(seeds).toEqual([]);
  });

  it('returns empty array for file with no headings', () => {
    const path = seedFile('noheadings.md', 'just some text without headings');
    const seeds = parseSeeds(path);
    expect(seeds).toEqual([]);
  });

  it('handles all valid content types', () => {
    const types = ['pain', 'insight', 'capability', 'proof', 'update', 'blog'];
    const lines = types.flatMap((t) => [`## ${t}`, `${t} seed text`, '']);
    const path = seedFile('alltypes.md', lines.join('\n'));

    const seeds = parseSeeds(path);
    expect(seeds).toHaveLength(6);
    for (let i = 0; i < types.length; i++) {
      expect(seeds[i].type).toBe(types[i]);
      expect(seeds[i].text).toBe(`${types[i]} seed text`);
    }
  });

  it('handles multi-line paragraphs within a seed', () => {
    const path = seedFile('multiline.md', [
      '## insight',
      'line one of the insight',
      'line two of the insight',
      '',
      'separate seed',
    ].join('\n'));

    const seeds = parseSeeds(path);
    expect(seeds).toHaveLength(2);
    expect(seeds[0].text).toBe('line one of the insight\nline two of the insight');
    expect(seeds[1].text).toBe('separate seed');
  });
});
