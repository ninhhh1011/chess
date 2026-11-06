import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock('../lib/supabaseClient', () => ({
  default: { auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange } },
  isSupabaseConfigured: true,
}));

function AuthProbe() {
  const auth = useAuth();
  return <output>{`${auth.user?.id || 'guest'}:${auth.loading ? 'loading' : 'ready'}`}</output>;
}

describe('AuthProvider session ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not let a late initial session overwrite a newer auth event', async () => {
    let resolveInitialSession;
    let onAuthEvent;
    const subscription = { unsubscribe: vi.fn() };
    mocks.getSession.mockReturnValue(new Promise((resolve) => { resolveInitialSession = resolve; }));
    mocks.onAuthStateChange.mockImplementation((callback) => {
      onAuthEvent = callback;
      return { data: { subscription } };
    });

    const view = render(<AuthProvider><AuthProbe /></AuthProvider>);
    expect(mocks.onAuthStateChange.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.getSession.mock.invocationCallOrder[0]);
    act(() => onAuthEvent('SIGNED_IN', { user: { id: 'new-user' } }));
    await act(async () => resolveInitialSession({ data: { session: { user: { id: 'stale-user' } } } }));

    expect(screen.getByText('new-user:ready')).toBeInTheDocument();
    view.unmount();
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });
});
