import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface LinkedInCredentials {
  LINKEDIN_ACCESS_TOKEN: string;
  LINKEDIN_PERSON_URN: string;
}

const CREDENTIALS_PATH = join(homedir(), '.config', 'cryyer', 'credentials.json');

/**
 * Load LinkedIn credentials from env vars or ~/.config/cryyer/credentials.json.
 * Returns null if no credentials are found.
 */
export function loadLinkedInCredentials(): LinkedInCredentials | null {
  const token = process.env['LINKEDIN_ACCESS_TOKEN'];
  const urn = process.env['LINKEDIN_PERSON_URN'];

  if (token && urn) {
    return { LINKEDIN_ACCESS_TOKEN: token, LINKEDIN_PERSON_URN: urn };
  }

  try {
    const raw = readFileSync(CREDENTIALS_PATH, 'utf-8');
    const data = JSON.parse(raw) as Record<string, string>;
    const fileToken = data['LINKEDIN_ACCESS_TOKEN'];
    const fileUrn = data['LINKEDIN_PERSON_URN'];

    if (fileToken && fileUrn) {
      return { LINKEDIN_ACCESS_TOKEN: fileToken, LINKEDIN_PERSON_URN: fileUrn };
    }
  } catch {
    // File doesn't exist or is invalid — that's fine
  }

  return null;
}

/**
 * Save LinkedIn credentials to ~/.config/cryyer/credentials.json.
 * Merges with any existing data in the file.
 */
export function saveLinkedInCredentials(creds: LinkedInCredentials): void {
  const dir = dirname(CREDENTIALS_PATH);
  mkdirSync(dir, { recursive: true });

  let existing: Record<string, string> = {};
  try {
    existing = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8')) as Record<string, string>;
  } catch {
    // No existing file
  }

  const merged = {
    ...existing,
    LINKEDIN_ACCESS_TOKEN: creds.LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_PERSON_URN: creds.LINKEDIN_PERSON_URN,
  };

  writeFileSync(CREDENTIALS_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}

export function getCredentialsPath(): string {
  return CREDENTIALS_PATH;
}
