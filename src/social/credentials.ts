import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface LinkedInCredentials {
  LINKEDIN_ACCESS_TOKEN: string;
  LINKEDIN_PERSON_URN: string;
}

export interface BlueskyCredentials {
  BLUESKY_HANDLE: string;
  BLUESKY_APP_PASSWORD: string;
}

export interface XCredentials {
  X_API_KEY: string;
  X_API_SECRET: string;
  X_ACCESS_TOKEN: string;
  X_ACCESS_TOKEN_SECRET: string;
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

/**
 * Load Bluesky credentials from env vars or ~/.config/cryyer/credentials.json.
 * Returns null if no credentials are found.
 */
export function loadBlueskyCredentials(): BlueskyCredentials | null {
  const handle = process.env['BLUESKY_HANDLE'];
  const appPassword = process.env['BLUESKY_APP_PASSWORD'];

  if (handle && appPassword) {
    return { BLUESKY_HANDLE: handle, BLUESKY_APP_PASSWORD: appPassword };
  }

  try {
    const raw = readFileSync(CREDENTIALS_PATH, 'utf-8');
    const data = JSON.parse(raw) as Record<string, string>;
    const fileHandle = data['BLUESKY_HANDLE'];
    const fileAppPassword = data['BLUESKY_APP_PASSWORD'];

    if (fileHandle && fileAppPassword) {
      return { BLUESKY_HANDLE: fileHandle, BLUESKY_APP_PASSWORD: fileAppPassword };
    }
  } catch {
    // File doesn't exist or is invalid
  }

  return null;
}

/**
 * Save Bluesky credentials to ~/.config/cryyer/credentials.json.
 * Merges with any existing data in the file.
 */
export function saveBlueskyCredentials(creds: BlueskyCredentials): void {
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
    BLUESKY_HANDLE: creds.BLUESKY_HANDLE,
    BLUESKY_APP_PASSWORD: creds.BLUESKY_APP_PASSWORD,
  };

  writeFileSync(CREDENTIALS_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}

/**
 * Load X (Twitter) credentials from env vars or ~/.config/cryyer/credentials.json.
 * Returns null if no credentials are found.
 */
export function loadXCredentials(): XCredentials | null {
  const apiKey = process.env['X_API_KEY'];
  const apiSecret = process.env['X_API_SECRET'];
  const accessToken = process.env['X_ACCESS_TOKEN'];
  const accessTokenSecret = process.env['X_ACCESS_TOKEN_SECRET'];

  if (apiKey && apiSecret && accessToken && accessTokenSecret) {
    return {
      X_API_KEY: apiKey,
      X_API_SECRET: apiSecret,
      X_ACCESS_TOKEN: accessToken,
      X_ACCESS_TOKEN_SECRET: accessTokenSecret,
    };
  }

  try {
    const raw = readFileSync(CREDENTIALS_PATH, 'utf-8');
    const data = JSON.parse(raw) as Record<string, string>;
    const fileApiKey = data['X_API_KEY'];
    const fileApiSecret = data['X_API_SECRET'];
    const fileAccessToken = data['X_ACCESS_TOKEN'];
    const fileAccessTokenSecret = data['X_ACCESS_TOKEN_SECRET'];

    if (fileApiKey && fileApiSecret && fileAccessToken && fileAccessTokenSecret) {
      return {
        X_API_KEY: fileApiKey,
        X_API_SECRET: fileApiSecret,
        X_ACCESS_TOKEN: fileAccessToken,
        X_ACCESS_TOKEN_SECRET: fileAccessTokenSecret,
      };
    }
  } catch {
    // File doesn't exist or is invalid
  }

  return null;
}

/**
 * Save X (Twitter) credentials to ~/.config/cryyer/credentials.json.
 * Merges with any existing data in the file.
 */
export function saveXCredentials(creds: XCredentials): void {
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
    X_API_KEY: creds.X_API_KEY,
    X_API_SECRET: creds.X_API_SECRET,
    X_ACCESS_TOKEN: creds.X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET: creds.X_ACCESS_TOKEN_SECRET,
  };

  writeFileSync(CREDENTIALS_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}
