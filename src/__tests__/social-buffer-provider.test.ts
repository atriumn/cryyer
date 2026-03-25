import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listProfiles, createPost } from '../social/buffer-provider.js';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listProfiles', () => {
  it('returns profiles from the API', async () => {
    const profiles = [
      { id: 'p1', service: 'twitter', formatted_service: 'Twitter' },
      { id: 'p2', service: 'linkedin', formatted_service: 'LinkedIn' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(profiles),
    });

    const result = await listProfiles('test-token');
    expect(result).toEqual(profiles);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('profiles.json?access_token=test-token'),
    );
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(listProfiles('bad-token')).rejects.toThrow(
      'Buffer API error: 401 Unauthorized',
    );
  });
});

describe('createPost', () => {
  it('sends a post and returns the update ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          updates: [{ id: 'u123' }],
        }),
    });

    const id = await createPost('token', 'profile1', 'Hello world');
    expect(id).toBe('u123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('updates/create.json'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('includes scheduled_at when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          updates: [{ id: 'u456' }],
        }),
    });

    await createPost('token', 'profile1', 'Scheduled', '2026-04-01T10:00:00Z');
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    const body = lastCall[1].body as string;
    expect(body).toContain('scheduled_at');
  });

  it('throws when success is false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    });

    await expect(
      createPost('token', 'profile1', 'fail'),
    ).rejects.toThrow('post creation failed');
  });
});
