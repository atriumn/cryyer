import { createServer } from 'http';
import { exec } from 'child_process';
import { saveLinkedInCredentials, getCredentialsPath } from './social/credentials.js';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_SCOPES = 'openid profile w_member_social';
const LINKEDIN_REDIRECT_URI = 'http://localhost:3000/callback';

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? 'open' :
    platform === 'win32' ? 'start' :
    'xdg-open';
  exec(`${cmd} "${url}"`);
}

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
}

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  email?: string;
}

export async function authLinkedIn(): Promise<void> {
  const clientId = process.env['LINKEDIN_CLIENT_ID'];
  const clientSecret = process.env['LINKEDIN_CLIENT_SECRET'];

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing LINKEDIN_CLIENT_ID and/or LINKEDIN_CLIENT_SECRET environment variables.\n' +
        'Create a LinkedIn app at https://www.linkedin.com/developers/apps and set these env vars.',
    );
  }

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost:3000');
        if (url.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const error = url.searchParams.get('error');
        if (error) {
          const desc = url.searchParams.get('error_description') ?? error;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authorization denied</h1><p>${desc}</p><p>You can close this window.</p>`);
          server.close();
          reject(new Error(`LinkedIn OAuth error: ${desc}`));
          return;
        }

        const code = url.searchParams.get('code');
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Missing authorization code</h1>');
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        // Exchange code for access token
        const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: LINKEDIN_REDIRECT_URI,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          const errText = await tokenResponse.text();
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<h1>Token exchange failed</h1><p>${tokenResponse.status}: ${errText}</p>`);
          server.close();
          reject(new Error(`LinkedIn token exchange failed: ${tokenResponse.status} ${errText}`));
          return;
        }

        const tokenData = (await tokenResponse.json()) as LinkedInTokenResponse;
        const accessToken = tokenData.access_token;

        // Fetch user profile to get person URN
        const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userResponse.ok) {
          const errText = await userResponse.text();
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<h1>Failed to fetch profile</h1><p>${userResponse.status}: ${errText}</p>`);
          server.close();
          reject(new Error(`LinkedIn userinfo failed: ${userResponse.status} ${errText}`));
          return;
        }

        const userInfo = (await userResponse.json()) as LinkedInUserInfo;
        const personUrn = `urn:li:person:${userInfo.sub}`;

        // Save credentials
        saveLinkedInCredentials({
          LINKEDIN_ACCESS_TOKEN: accessToken,
          LINKEDIN_PERSON_URN: personUrn,
        });

        const credPath = getCredentialsPath();
        const displayName = userInfo.name ?? userInfo.sub;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          `<h1>LinkedIn authorized!</h1>` +
            `<p>Authenticated as <strong>${displayName}</strong></p>` +
            `<p>Credentials saved to ${credPath}</p>` +
            `<p>You can close this window.</p>`,
        );

        console.log('');
        console.log(`  LinkedIn authorized successfully!`);
        console.log(`  Authenticated as: ${displayName} (${personUrn})`);
        console.log(`  Credentials saved to: ${credPath}`);
        console.log(`  Token expires in: ${Math.round(tokenData.expires_in / 86400)} days`);
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

    server.listen(3000, () => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        scope: LINKEDIN_SCOPES,
      });

      const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;

      console.log('');
      console.log('  Opening browser for LinkedIn authorization...');
      console.log(`  If it doesn't open, visit: ${authUrl}`);
      console.log('');

      openBrowser(authUrl);
    });

    server.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        reject(new Error('Port 3000 is already in use. Stop whatever is using it and try again.'));
      } else {
        reject(err);
      }
    });
  });
}

export async function main(): Promise<void> {
  const subcommand = process.argv[3];

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    console.log(`
cryyer auth — manage authentication

Usage:
  cryyer auth linkedin    Authorize LinkedIn via OAuth 2.0

LinkedIn: Opens browser to authorize posting. Credentials saved to ~/.config/cryyer/credentials.json.
  Requires LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET env vars.
`.trimStart());
    return;
  }

  if (subcommand === 'linkedin') {
    await authLinkedIn();
    return;
  }

  console.error(`Unknown auth provider: ${subcommand}`);
  console.error('Supported: linkedin');
  process.exitCode = 1;
}
