import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserProfile: vi.fn(), migrateUserProfile: vi.fn((profile) => profile), saveUserProfile: vi.fn((profile) => profile),
  getCloudProfile: vi.fn(), saveCloudProfile: vi.fn(),
}));

vi.mock('../services/userProfileService', () => ({
  getUserProfile: mocks.getUserProfile,
  migrateUserProfile: mocks.migrateUserProfile,
  saveUserProfile: mocks.saveUserProfile,
}));
vi.mock('../services/cloudProfileService', () => ({
  getCloudProfile: mocks.getCloudProfile,
  createCloudProfile: vi.fn(),
  saveCloudProfile: mocks.saveCloudProfile,
}));

import {
  getSyncStatus,
  handleSyncPrompt,
  setSyncStatus,
  syncOnAction,
  syncOnLogin,
} from '../services/syncService';

const profile = {
  profileId: 'profile:local', revision: 3, updatedAt: '2026-09-06T08:00:00.000Z',
  gamesPlayed: 1, lessonsCompleted: [], persistence: { sync: { revision: 3 } },
};
const saved = { id: 'row:one', user_id: 'user:one', profile_data: profile };

describe('cloud sync status and retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSyncStatus('local_only');
    mocks.getUserProfile.mockReturnValue(profile);
  });

  test('does not report synced when an action adapter returns no row', async () => {
    mocks.saveCloudProfile.mockResolvedValue(null);

    await expect(syncOnAction('user:one', 'save_profile')).resolves.toBeNull();
    expect(getSyncStatus()).toBe('error');
  });

  test('returns each successful retry while reusing the same user identity', async () => {
    mocks.saveCloudProfile.mockResolvedValue(saved);

    await expect(Promise.all([
      syncOnAction('user:one', 'save_profile'),
      syncOnAction('user:one', 'save_profile'),
    ])).resolves.toEqual([saved, saved]);
    expect(mocks.saveCloudProfile).toHaveBeenNthCalledWith(1, 'user:one', profile);
    expect(mocks.saveCloudProfile).toHaveBeenNthCalledWith(2, 'user:one', profile);
    expect(getSyncStatus()).toBe('synced');
  });

  test('does not overwrite a failed login upload with a synced status', async () => {
    mocks.getCloudProfile.mockResolvedValue(null);
    mocks.saveCloudProfile.mockResolvedValue(null);

    await expect(syncOnLogin('user:one')).resolves.toBeNull();
    expect(getSyncStatus()).toBe('error');
  });

  test('reports creation only when the missing-cloud upload succeeds', async () => {
    mocks.getCloudProfile.mockResolvedValue(null);
    mocks.saveCloudProfile.mockResolvedValue(null);
    await expect(handleSyncPrompt('user:one')).resolves.toMatchObject({ action: 'error' });

    mocks.saveCloudProfile.mockResolvedValue(saved);
    await expect(handleSyncPrompt('user:one')).resolves.toMatchObject({ action: 'created', profile });
  });
});
