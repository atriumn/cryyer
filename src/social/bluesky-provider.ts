export interface BlueskySession {
  did: string;
  accessJwt: string;
}

/**
 * Authenticate with Bluesky using handle + app password.
 * Returns a session with DID and access JWT.
 */
async function createSession(
  handle: string,
  appPassword: string,
): Promise<BlueskySession> {
  const response = await fetch(
    'https://bsky.social/xrpc/com.atproto.server.createSession',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Bluesky auth error: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`,
    );
  }

  const data = (await response.json()) as BlueskySession;
  return { did: data.did, accessJwt: data.accessJwt };
}

/**
 * Post a text update to Bluesky via the AT Protocol.
 * Returns the AT URI of the created post.
 */
export async function postToBluesky(
  handle: string,
  appPassword: string,
  text: string,
): Promise<string> {
  const session = await createSession(handle, appPassword);

  const body = {
    repo: session.did,
    collection: 'app.bsky.feed.post',
    record: {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
    },
  };

  const response = await fetch(
    'https://bsky.social/xrpc/com.atproto.repo.createRecord',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessJwt}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Bluesky post error: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`,
    );
  }

  const result = (await response.json()) as { uri: string };
  return result.uri;
}
