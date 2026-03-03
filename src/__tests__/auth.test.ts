import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    generateAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?mock=true'),
    getToken: vi.fn().mockResolvedValue({
      tokens: { refresh_token: 'mock_refresh_token', access_token: 'mock_access' },
    }),
    _redirectUri: '',
  })),
}));

import { main } from '../auth.js';

describe('auth CLI', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prints help when no subcommand given', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'auth.js'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('cryyer auth'));
    logSpy.mockRestore();
    process.argv = originalArgv;
  });

  it('reports error for unknown subcommand', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'auth.js', undefined as unknown as string, 'sendgrid'];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await main();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown auth provider'));
    expect(process.exitCode).toBe(1);
    errorSpy.mockRestore();
    process.argv = originalArgv;
    process.exitCode = undefined;
  });
});
