import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { OAuth2Client } from 'google-auth-library';
import { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } from './gmail-oauth.js';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? 'open' :
    platform === 'win32' ? 'start' :
    'xdg-open';
  exec(`${cmd} "${url}"`);
}

function updateEnvFile(key: string, value: string): void {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${key}=${value}\n`, 'utf-8');
    return;
  }

  const content = readFileSync(envPath, 'utf-8');
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    writeFileSync(envPath, content.replace(regex, `${key}=${value}`), 'utf-8');
  } else {
    const suffix = content.endsWith('\n') ? '' : '\n';
    writeFileSync(envPath, content + suffix + `${key}=${value}\n`, 'utf-8');
  }
}

export async function authGmail(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://localhost`);
        if (url.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization denied</h1><p>You can close this window.</p>');
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Missing authorization code</h1>');
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        // Exchange code for tokens
        const redirectUri = `http://localhost:${(server.address() as { port: number }).port}/callback`;
        const tokenClient = new OAuth2Client(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, redirectUri);
        const { tokens } = await tokenClient.getToken(code);

        if (!tokens.refresh_token) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Error</h1><p>No refresh token received. Try revoking access at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> and re-running this command.</p>');
          server.close();
          reject(new Error('No refresh token received. Revoke access and try again.'));
          return;
        }

        // Save to .env
        updateEnvFile('GMAIL_REFRESH_TOKEN', tokens.refresh_token);
        updateEnvFile('EMAIL_PROVIDER', 'gmail');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Gmail authorized!</h1><p>Refresh token saved to .env. You can close this window.</p>');

        console.log('');
        console.log('  Gmail authorized successfully!');
        console.log('  GMAIL_REFRESH_TOKEN saved to .env');
        console.log('  EMAIL_PROVIDER set to gmail');
        console.log('');

        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>Something went wrong.</p>');
        server.close();
        reject(err);
      }
    });

    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      const redirectUri = `http://localhost:${port}/callback`;
      const authClient = new OAuth2Client(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, redirectUri);

      const authUrl = authClient.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [GMAIL_SCOPE],
      });

      console.log('');
      console.log('  Opening browser for Gmail authorization...');
      console.log(`  If it doesn't open, visit: ${authUrl}`);
      console.log('');

      openBrowser(authUrl);
    });

    server.on('error', reject);
  });
}

export async function main(): Promise<void> {
  const subcommand = process.argv[3];

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    console.log(`
cryyer auth — manage authentication for email providers

Usage:
  cryyer auth gmail    Authorize Gmail via OAuth 2.0

This opens your browser to authorize cryyer to send emails
from your Gmail account. The refresh token is saved to .env.
`.trimStart());
    return;
  }

  if (subcommand === 'gmail') {
    await authGmail();
    return;
  }

  console.error(`Unknown auth provider: ${subcommand}`);
  console.error('Supported: gmail');
  process.exitCode = 1;
}
