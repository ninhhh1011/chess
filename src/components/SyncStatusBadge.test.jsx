import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setSyncStatus } from '../services/syncService';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import SyncStatusBadge from './SyncStatusBadge';

const { getSessionMock, authStateChangeMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(), authStateChangeMock: vi.fn(),
}));
vi.mock('../lib/supabaseClient', () => ({
  default: { auth: { getSession: getSessionMock, onAuthStateChange: authStateChangeMock } },
  isSupabaseConfigured: true,
}));

function AuthProbe() {
  const { user } = useAuth();
  return <output>{user?.id || 'guest'}</output>;
}

describe('SyncStatusBadge', () => {
  beforeEach(() => setSyncStatus('local_only'));

  it('reacts to sync status changes after mounting', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user:one' } } } });
    authStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    render(<AuthProvider><AuthProbe /><SyncStatusBadge /></AuthProvider>);
    expect(await screen.findByText('user:one')).toBeInTheDocument();

    act(() => setSyncStatus('syncing'));
    expect(screen.getByText('Đang đồng bộ')).toBeInTheDocument();
  });
});
