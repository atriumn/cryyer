/**
 * Verification tests for #52 and #53: confirm deprecated modules are removed
 * and dist/ is not tracked in git.
 *
 * These files were removed in PRs #39 and #40 (before this branch was created).
 * These tests serve as a regression guard to ensure they are not re-introduced.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('#52: deprecated modules removed from src/', () => {
  const srcDir = join(process.cwd(), 'src');

  const deprecatedFiles = [
    'db.ts',
    'subscribers.ts',
    'llm.ts',
    'email.ts',
    'github.ts',
  ];

  for (const file of deprecatedFiles) {
    it(`src/${file} does not exist`, () => {
      expect(existsSync(join(srcDir, file))).toBe(false);
    });
  }
});

describe('#53: dist/ is not committed to git', () => {
  it('dist/ is listed in .gitignore', () => {
    const gitignore = join(process.cwd(), '.gitignore');
    const content = readFileSync(gitignore, 'utf-8');
    expect(content).toMatch(/^dist\/$/m);
  });
});
