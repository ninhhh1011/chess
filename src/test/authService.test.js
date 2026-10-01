import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const signIn = vi.fn();
  const signUp = vi.fn();
  const signOut = vi.fn();

  return { signIn, signUp, signOut };
});

vi.mock('../lib/supabaseClient', () => ({
  default: {
    auth: {
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
    },
  },
  isSupabaseConfigured: true,
}));

import { signInWithEmail, signOutUser, signUpWithEmail } from '../services/authService';

describe('auth service async adapters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('awaits sign in and returns the authenticated user', async () => {
    const user = { id: 'user-1' };
    mocks.signIn.mockResolvedValue({ data: { user }, error: null });

    await expect(signInWithEmail({ email: 'user@example.com', password: 'secret' }, mocks.signIn))
      .resolves.toMatchObject({ success: true, user });
  });

  it('maps an asynchronous sign-in error', async () => {
    mocks.signIn.mockResolvedValue({ data: null, error: { message: 'Invalid login' } });

    await expect(signInWithEmail({ email: 'user@example.com', password: 'secret' }, mocks.signIn))
      .resolves.toEqual({ success: false, error: 'Invalid login' });
  });

  it('awaits sign up and returns the created user', async () => {
    const user = { id: 'user-2' };
    mocks.signUp.mockResolvedValue({ data: { user }, error: null });

    await expect(signUpWithEmail({
      email: 'new@example.com',
      password: 'secret',
      displayName: 'New User',
    }, mocks.signUp)).resolves.toMatchObject({ success: true, user });
  });

  it('awaits sign out before reporting success', async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await expect(signOutUser(mocks.signOut)).resolves.toMatchObject({ success: true });
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
