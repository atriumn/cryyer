#!/usr/bin/env node
import { join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { stringify as stringifyYaml } from 'yaml';

export function sanitizeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function main(): Promise<void> {
  const rl = createInterface({ input, output });

  console.log('Cryyer Product Setup');
  console.log('='.repeat(40));
  console.log('This will create a new product configuration file.\n');

  try {
    const rawName = await rl.question('Product name (e.g., "My App"): ');
    const name = rawName.trim();
    if (!name) throw new Error('Product name is required');

    const defaultId = sanitizeId(name);
    const rawId = await rl.question(`Product ID [${defaultId}]: `);
    const id = rawId.trim() || defaultId;
    if (!id) throw new Error('Product ID is required');

    const rawRepo = await rl.question('GitHub repo (owner/repo, e.g., "acme/my-app"): ');
    const repo = rawRepo.trim();
    if (!repo || !repo.includes('/')) throw new Error('GitHub repo must be in owner/repo format');

    const defaultSubjectTemplate = `{{weekOf}} Weekly Update — ${name}`;
    const rawSubjectTemplate = await rl.question(`Email subject template [${defaultSubjectTemplate}]: `);
    const emailSubjectTemplate = rawSubjectTemplate.trim() || defaultSubjectTemplate;

    console.log('\nVoice/tone: Describe how this product should communicate with beta testers.');
    console.log('Example: "Friendly and technical, focused on developer experience"');
    const rawVoice = await rl.question('Voice/tone: ');
    const voice = rawVoice.trim();
    if (!voice) throw new Error('Voice/tone is required');

    const productsDir = join(process.cwd(), 'products');
    if (!existsSync(productsDir)) {
      mkdirSync(productsDir, { recursive: true });
    }

    const outputPath = join(productsDir, `${id}.yaml`);

    if (existsSync(outputPath)) {
      const rawOverwrite = await rl.question(`File already exists: ${outputPath}\nOverwrite? (y/N): `);
      if (rawOverwrite.trim().toLowerCase() !== 'y') {
        console.log('Aborted.');
        return;
      }
    }

    const productConfig = { id, name, repo, emailSubjectTemplate, voice };
    const yaml = `# Product configuration for ${name}\n` + stringifyYaml(productConfig);
    writeFileSync(outputPath, yaml, 'utf-8');
    console.log(`\nProduct config written to: ${outputPath}`);

    // Optionally scaffold .env from .env.example
    const envExamplePath = join(process.cwd(), '.env.example');
    const envPath = join(process.cwd(), '.env');
    if (existsSync(envExamplePath) && !existsSync(envPath)) {
      const rawScaffold = await rl.question('\nScaffold .env from .env.example? (Y/n): ');
      if (rawScaffold.trim().toLowerCase() !== 'n') {
        const envContent = readFileSync(envExamplePath, 'utf-8');
        writeFileSync(envPath, envContent, 'utf-8');
        console.log('.env created from .env.example. Fill in your actual values.');
      }
    }

    console.log('\nDone! Next steps:');
    console.log(`  1. Review: ${outputPath}`);
    console.log('  2. Set required environment variables (see .env.example)');
    console.log('  3. Run: pnpm run check  (validate your setup)');
    console.log('  4. Run: DRY_RUN=true pnpm run dev  (preview emails)');
  } finally {
    rl.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
