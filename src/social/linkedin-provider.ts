export interface LinkedInPostResponse {
  id: string;
}

/**
 * Post a text-only update to LinkedIn using the /rest/posts endpoint.
 * Returns the post URN (e.g. "urn:li:share:7123456789").
 */
export async function postToLinkedIn(
  token: string,
  personUrn: string,
  text: string,
): Promise<string> {
  const body = {
    author: personUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202501',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `LinkedIn API error: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`,
    );
  }

  // LinkedIn returns the post URN in the x-restli-id header on 201 Created
  const postUrn = response.headers.get('x-restli-id');
  if (postUrn) {
    return postUrn;
  }

  // Fallback: try to parse the response body
  const result = (await response.json().catch(() => ({}))) as Record<string, string>;
  return result['id'] ?? 'unknown';
}
