import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { loadPlatforms } from '../social/platforms.js';

const TMP_DIR = join(process.cwd(), '.tmp-test-platforms');

function platformFile(name: string, content: string): void {
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(join(TMP_DIR, name), content, 'utf-8');
}

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('loadPlatforms', () => {
  it('loads all platform YAML files from the default platforms/ directory', () => {
    const platforms = loadPlatforms(join(process.cwd(), 'platforms'));
    expect(platforms.length).toBe(3);
    const ids = platforms.map((p) => p.id).sort();
    expect(ids).toEqual(['bluesky', 'linkedin', 'twitter']);
  });

  it('validates required fields on each platform', () => {
    const platforms = loadPlatforms(join(process.cwd(), 'platforms'));
    for (const platform of platforms) {
      expect(typeof platform.id).toBe('string');
      expect(platform.id.length).toBeGreaterThan(0);
      expect(typeof platform.name).toBe('string');
      expect(platform.name.length).toBeGreaterThan(0);
      expect(typeof platform.maxLength).toBe('number');
      expect(platform.maxLength).toBeGreaterThan(0);
      expect(typeof platform.voice).toBe('string');
      expect(platform.voice.length).toBeGreaterThan(0);
    }
  });

  it('loads optional thread fields on twitter', () => {
    const platforms = loadPlatforms(join(process.cwd(), 'platforms'));
    const twitter = platforms.find((p) => p.id === 'twitter');
    expect(twitter).toBeDefined();
    expect(twitter!.threadSupport).toBe(true);
    expect(twitter!.threadMaxParts).toBe(4);
  });

  it('omits thread fields on platforms without them', () => {
    const platforms = loadPlatforms(join(process.cwd(), 'platforms'));
    const linkedin = platforms.find((p) => p.id === 'linkedin');
    expect(linkedin).toBeDefined();
    expect(linkedin!.threadSupport).toBeUndefined();
    expect(linkedin!.threadMaxParts).toBeUndefined();
  });

  it('throws when id is missing', () => {
    platformFile('bad.yaml', 'name: Bad\nmaxLength: 100\nvoice: "test"');
    expect(() => loadPlatforms(TMP_DIR)).toThrow('missing required field "id"');
  });

  it('throws when name is missing', () => {
    platformFile('bad.yaml', 'id: bad\nmaxLength: 100\nvoice: "test"');
    expect(() => loadPlatforms(TMP_DIR)).toThrow('missing required field "name"');
  });

  it('throws when maxLength is missing', () => {
    platformFile('bad.yaml', 'id: bad\nname: Bad\nvoice: "test"');
    expect(() => loadPlatforms(TMP_DIR)).toThrow('missing or invalid required field "maxLength"');
  });

  it('throws when voice is missing', () => {
    platformFile('bad.yaml', 'id: bad\nname: Bad\nmaxLength: 100');
    expect(() => loadPlatforms(TMP_DIR)).toThrow('missing required field "voice"');
  });

  it('loads from a custom directory', () => {
    platformFile('custom.yaml', [
      'id: mastodon',
      'name: Mastodon',
      'maxLength: 500',
      'voice: "friendly, open-source vibes"',
    ].join('\n'));

    const platforms = loadPlatforms(TMP_DIR);
    expect(platforms).toHaveLength(1);
    expect(platforms[0].id).toBe('mastodon');
  });

  it('throws on non-existent directory', () => {
    expect(() => loadPlatforms('/tmp/nonexistent-cryyer-platforms')).toThrow();
  });
});
