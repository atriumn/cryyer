import { fileURLToPath } from 'url';
import { readSocialDraft } from './draft-file.js';
import { postToLinkedIn } from './linkedin-provider.js';
import { postToBluesky } from './bluesky-provider.js';
import { postToX } from './x-provider.js';
import {
  loadLinkedInCredentials,
  loadBlueskyCredentials,
  loadXCredentials,
} from './credentials.js';

export function parseArgv(argv: string[]): {
  draftPath: string;
  dryRun: boolean;
  configDir?: string;
} {
  const args = argv[0] === 'send' ? argv.slice(1) : argv;

  let draftPath: string | undefined;
  let dryRun = false;
  let configDir: string | undefined = process.env['CRYYER_CONFIG_DIR'];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--config-dir' && args[i + 1]) {
      configDir = args[i + 1];
      i++;
    } else if (!args[i]!.startsWith('-') && !draftPath) {
      draftPath = args[i];
    }
  }

  if (!draftPath) {
    throw new Error(
      'Missing draft path. Usage: cryyer social send <draft-path> [--dry-run] [--config-dir <path>]',
    );
  }

  return { draftPath, dryRun, configDir: configDir || undefined };
}

export async function main(): Promise<void> {
  const { draftPath, dryRun } = parseArgv(process.argv.slice(2));

  const draft = readSocialDraft(draftPath);

  // Load credentials for all platforms (env vars take precedence over config file)
  const linkedInCreds = loadLinkedInCredentials();
  const blueskyCreds = loadBlueskyCredentials();
  const xCreds = loadXCredentials();

  let posted = 0;
  let skipped = 0;

  for (const post of draft.posts) {
    const platformId = post.platform.id;

    if (dryRun) {
      console.log(`\n[DRY RUN] ${platformId}:`);
      console.log(post.text);
      posted++;
      continue;
    }

    if (platformId === 'linkedin') {
      if (!linkedInCreds) {
        console.warn(
          '  Skipping linkedin: no credentials configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN env vars or run "cryyer auth linkedin".',
        );
        skipped++;
        continue;
      }
      const urn = await postToLinkedIn(
        linkedInCreds.LINKEDIN_ACCESS_TOKEN,
        linkedInCreds.LINKEDIN_PERSON_URN,
        post.text,
      );
      console.log(`  Posted to LinkedIn: ${urn}`);
      posted++;
    } else if (platformId === 'bluesky') {
      if (!blueskyCreds) {
        console.warn(
          '  Skipping bluesky: no credentials configured. Set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD env vars.',
        );
        skipped++;
        continue;
      }
      const uri = await postToBluesky(
        blueskyCreds.BLUESKY_HANDLE,
        blueskyCreds.BLUESKY_APP_PASSWORD,
        post.text,
      );
      console.log(`  Posted to Bluesky: ${uri}`);
      posted++;
    } else if (platformId === 'x') {
      if (!xCreds) {
        console.warn(
          '  Skipping x: no credentials configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET env vars.',
        );
        skipped++;
        continue;
      }
      const tweetId = await postToX(
        xCreds.X_API_KEY,
        xCreds.X_API_SECRET,
        xCreds.X_ACCESS_TOKEN,
        xCreds.X_ACCESS_TOKEN_SECRET,
        post.text,
      );
      console.log(`  Posted to X: ${tweetId}`);
      posted++;
    } else {
      console.warn(`  Skipping ${platformId}: direct posting not yet supported`);
      skipped++;
    }
  }

  console.log(`\nPosted ${posted} posts${skipped > 0 ? `, skipped ${skipped}` : ''}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
