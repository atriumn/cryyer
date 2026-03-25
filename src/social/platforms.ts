import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { Platform } from './types.js';

/**
 * Load platform configurations from YAML files in the given directory.
 * Defaults to `platforms/` relative to the project root (process.cwd()).
 */
export function loadPlatforms(dir?: string): Platform[] {
  const platformsDir = dir ?? join(process.cwd(), 'platforms');
  const files = readdirSync(platformsDir).filter(
    (f) => f.endsWith('.yaml') || f.endsWith('.yml'),
  );

  return files.map((file) => {
    const content = readFileSync(join(platformsDir, file), 'utf-8');
    const platform = parseYaml(content) as Platform;
    validatePlatform(platform, file);
    return platform;
  });
}

function validatePlatform(platform: Platform, file: string): void {
  if (!platform.id) {
    throw new Error(`Platform in ${file}: missing required field "id"`);
  }
  if (!platform.name) {
    throw new Error(`Platform "${platform.id}" in ${file}: missing required field "name"`);
  }
  if (platform.maxLength == null || typeof platform.maxLength !== 'number') {
    throw new Error(`Platform "${platform.id}" in ${file}: missing or invalid required field "maxLength"`);
  }
  if (!platform.voice) {
    throw new Error(`Platform "${platform.id}" in ${file}: missing required field "voice"`);
  }
}
