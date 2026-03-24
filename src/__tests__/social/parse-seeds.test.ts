import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs');

import { parseSeeds, parseSeedsFromString } from '../../social/parse-seeds.js';
import { readFileSync } from 'fs';

const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;

describe('parseSeedsFromString', () => {
  it('parses a valid seeds file', () => {
    const content = `## pain
most devs run linters but never catch architectural drift

## insight
we rotate between claude, gpt-4, and gemini because each catches different things
`;
    const seeds = parseSeedsFromString(content);
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

  it('parses multiple seeds per type (separate paragraphs)', () => {
    const content = `## pain
first pain point about the problem

second pain point with a different angle

## capability
noxaudit outputs SARIF for CI integration
`;
    const seeds = parseSeedsFromString(content);
    expect(seeds).toHaveLength(3);
    expect(seeds[0]).toEqual({ type: 'pain', text: 'first pain point about the problem' });
    expect(seeds[1]).toEqual({ type: 'pain', text: 'second pain point with a different angle' });
    expect(seeds[2]).toEqual({ type: 'capability', text: 'noxaudit outputs SARIF for CI integration' });
  });

  it('throws on unknown content type', () => {
    const content = `## unknown
this should fail
`;
    expect(() => parseSeedsFromString(content)).toThrow('Unknown content type: "unknown"');
  });

  it('returns empty array for empty file', () => {
    expect(parseSeedsFromString('')).toEqual([]);
    expect(parseSeedsFromString('   \n\n  ')).toEqual([]);
  });

  it('handles all valid content types', () => {
    const content = `## pain
a pain seed

## insight
an insight seed

## capability
a capability seed

## proof
a proof seed

## update
an update seed
`;
    const seeds = parseSeedsFromString(content);
    expect(seeds).toHaveLength(5);
    expect(seeds.map((s) => s.type)).toEqual(['pain', 'insight', 'capability', 'proof', 'update']);
  });
});

describe('parseSeeds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads file and parses seeds', () => {
    mockReadFileSync.mockReturnValue(`## pain
most devs run linters but never catch architectural drift

## insight
we rotate between providers because each catches different things
`);
    const seeds = parseSeeds('/some/seeds/product.md');
    expect(mockReadFileSync).toHaveBeenCalledWith('/some/seeds/product.md', 'utf-8');
    expect(seeds).toHaveLength(2);
    expect(seeds[0].type).toBe('pain');
    expect(seeds[1].type).toBe('insight');
  });

  it('throws on unknown content type from file', () => {
    mockReadFileSync.mockReturnValue(`## badtype
this should throw
`);
    expect(() => parseSeeds('/seeds/bad.md')).toThrow('Unknown content type: "badtype"');
  });
});
