import { describe, it, expect } from 'vitest';
import { parseArgv } from '../social/draft.js';

describe('social draft parseArgv', () => {
  it('parses --product flag', () => {
    const result = parseArgv(['--product', 'noxaudit']);
    expect(result.productId).toBe('noxaudit');
    expect(result.dryRun).toBe(false);
    expect(result.type).toBeUndefined();
  });

  it('parses --type flag', () => {
    const result = parseArgv(['--product', 'noxaudit', '--type', 'pain']);
    expect(result.type).toBe('pain');
  });

  it('parses --dry-run flag', () => {
    const result = parseArgv(['--product', 'noxaudit', '--dry-run']);
    expect(result.dryRun).toBe(true);
  });

  it('parses --config-dir flag', () => {
    const result = parseArgv([
      '--product',
      'noxaudit',
      '--config-dir',
      '/custom/dir',
    ]);
    expect(result.configDir).toBe('/custom/dir');
  });

  it('strips leading "draft" command word', () => {
    const result = parseArgv(['draft', '--product', 'noxaudit']);
    expect(result.productId).toBe('noxaudit');
  });

  it('throws when --product is missing', () => {
    expect(() => parseArgv(['--type', 'pain'])).toThrow('Missing --product');
  });
});
