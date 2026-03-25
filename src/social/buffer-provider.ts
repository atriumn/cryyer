export interface BufferProfile {
  id: string;
  service: string;
  formatted_service: string;
}

export interface BufferCreateResponse {
  success: boolean;
  updates: Array<{ id: string }>;
}

const BUFFER_API_BASE = 'https://api.bufferapp.com/1';

/**
 * List all profiles for the authenticated Buffer account.
 */
export async function listProfiles(token: string): Promise<BufferProfile[]> {
  const url = `${BUFFER_API_BASE}/profiles.json?access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Buffer API error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as BufferProfile[];
}

/**
 * Create a post in a Buffer profile's queue.
 * Returns the created update ID.
 */
export async function createPost(
  token: string,
  profileId: string,
  text: string,
  scheduledAt?: string,
): Promise<string> {
  const url = `${BUFFER_API_BASE}/updates/create.json`;

  const body: Record<string, string> = {
    access_token: token,
    text,
    'profile_ids[]': profileId,
  };

  if (scheduledAt) {
    body['scheduled_at'] = scheduledAt;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    throw new Error(`Buffer API error: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as BufferCreateResponse;
  if (!result.success || !result.updates?.length) {
    throw new Error('Buffer API: post creation failed');
  }

  return result.updates[0].id;
}
