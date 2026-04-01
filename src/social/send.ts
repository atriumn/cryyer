import { fileURLToPath } from 'url';
import { readSocialDraft } from './draft-file.js';
import { postToLinkedIn } from './linkedin-provider.js';
import { loadLinkedInCredentials } from './credentials.js';

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
    } else if (!args[i].startsWith('-') && !draftPath) {
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

  // Load LinkedIn credentials (env vars take precedence over config file)
  const creds = loadLinkedInCredentials();
  if (!creds && !dryRun) {
    throw new Error(
      'Missing LinkedIn credentials. Run "cryyer auth linkedin" or set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN env vars.',
    );
  }

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
      const urn = await postToLinkedIn(
        creds!.LINKEDIN_ACCESS_TOKEN,
        creds!.LINKEDIN_PERSON_URN,
        post.text,
      );
      console.log(`  Posted to LinkedIn: ${urn}`);
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
