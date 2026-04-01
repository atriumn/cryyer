import { createHmac, randomBytes } from 'crypto';

/**
 * Percent-encode a string per RFC 3986 (required for OAuth 1.0a).
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Build the OAuth 1.0a Authorization header for a request.
 */
function buildOAuthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // Build the parameter string (sorted by key)
  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k]!)}`)
    .join('&');

  // Build the signature base string
  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  // Build the signing key
  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`;

  // Generate HMAC-SHA1 signature
  const signature = createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  oauthParams['oauth_signature'] = signature;

  // Build the Authorization header value
  const headerValue = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k]!)}"`)
    .join(', ');

  return `OAuth ${headerValue}`;
}

/**
 * Post a tweet to X (Twitter) using OAuth 1.0a authentication.
 * Returns the tweet ID.
 */
export async function postToX(
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  text: string,
): Promise<string> {
  const url = 'https://api.twitter.com/2/tweets';

  const authHeader = buildOAuthHeader(
    'POST',
    url,
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret,
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `X API error: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`,
    );
  }

  const result = (await response.json()) as { data: { id: string } };
  return result.data.id;
}
