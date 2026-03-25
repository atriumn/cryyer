import { fileURLToPath } from 'url';
import { readSocialDraft } from './draft-file.js';
import * as bufferProvider from './buffer-provider.js';

const PLATFORM_ENV_MAP: Record<string, string> = {
  twitter: 'BUFFER_PROFILE_TWITTER',
  linkedin: 'BUFFER_PROFILE_LINKEDIN',
  bluesky: 'BUFFER_PROFILE_BLUESKY',
};

export function parseArgv(argv: string[]): {
  draftPath: string;
  dryRun: boolean;
} {
  const args = argv[0] === 'send' ? argv.slice(1) : argv;

  let draftPath: string | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (!args[i].startsWith('-') && !draftPath) {
      draftPath = args[i];
    }
  }

  if (!draftPath) {
    throw new Error(
      'Missing draft path. Usage: cryyer social send <draft-path> [--dry-run]',
    );
  }

  return { draftPath, dryRun };
}

export async function main(): Promise<void> {
  const { draftPath, dryRun } = parseArgv(process.argv.slice(2));

  const draft = readSocialDraft(draftPath);

  const token = process.env['BUFFER_ACCESS_TOKEN'];
  if (!token && !dryRun) {
    throw new Error('Missing BUFFER_ACCESS_TOKEN environment variable');
  }

  // Build platform-to-profile mapping
  const profileMap = new Map<string, string>();
  if (!dryRun) {
    const profiles = await bufferProvider.listProfiles(token!);
    for (const [platformId, envVar] of Object.entries(PLATFORM_ENV_MAP)) {
      const envProfileId = process.env[envVar];
      if (envProfileId) {
        // Verify profile exists
        const found = profiles.find((p) => p.id === envProfileId);
        if (!found) {
          console.warn(
            `Warning: ${envVar}=${envProfileId} not found in Buffer profiles`,
          );
        }
        profileMap.set(platformId, envProfileId);
      }
    }
  }

  let queued = 0;
  const platformCounts = new Map<string, number>();

  for (const post of draft.posts) {
    const platformId = post.platform.id;

    if (dryRun) {
      console.log(`\n[DRY RUN] ${platformId}:`);
      console.log(post.text);
      queued++;
      platformCounts.set(platformId, (platformCounts.get(platformId) ?? 0) + 1);
      continue;
    }

    const profileId = profileMap.get(platformId);
    if (!profileId) {
      console.warn(
        `Skipping ${platformId}: no profile configured (set ${PLATFORM_ENV_MAP[platformId] ?? `BUFFER_PROFILE_${platformId.toUpperCase()}`})`,
      );
      continue;
    }

    await bufferProvider.createPost(token!, profileId, post.text);
    queued++;
    platformCounts.set(platformId, (platformCounts.get(platformId) ?? 0) + 1);
  }

  const platformCount = platformCounts.size;
  console.log(`\nQueued ${queued} posts across ${platformCount} platforms`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
