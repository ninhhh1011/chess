import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  upload: vi.fn(), download: vi.fn(),
  auth: { user: { id: 'user:one', email: 'test@example.com' }, isAuthenticated: true },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../services/userProfileService', () => ({
  getUserProfile: () => ({
    currentLevel: 'noob', gamesPlayed: 0, dailyTrainingPlan: { tasks: [] },
    exerciseStats: { total: 0, accuracy: 0 }, openingStats: { completedOpenings: [], totalAttempts: 0 },
  }),
  updateDailyTrainingPlan: vi.fn(),
}));
vi.mock('../services/authService', () => ({ signOutUser: vi.fn() }));
vi.mock('../services/syncService', () => ({
  getSyncStatus: () => 'local_only', setSyncStatus: vi.fn(),
  syncLocalProfileToCloud: mocks.upload,
  loadCloudProfileToLocal: mocks.download,
  handleSyncPrompt: vi.fn(),
}));

import Training from '../pages/Training';

describe('training cloud sync controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ id: 'row:one' });
    mocks.download.mockResolvedValue({ profileId: 'profile:one' });
  });

  test('keeps explicit upload and download retries reachable and routes the clicked action', async () => {
    render(<MemoryRouter><Training /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /cloud/i }));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('user:one'));
    fireEvent.click(screen.getByRole('button', { name: /T.i v./i }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith('user:one'));
  });
});
