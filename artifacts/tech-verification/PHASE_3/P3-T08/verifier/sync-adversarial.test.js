import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserProfile: vi.fn(), migrateUserProfile: vi.fn(), saveUserProfile: vi.fn(),
  getCloudProfile: vi.fn(), saveCloudProfile: vi.fn(),
}));
vi.mock('../../../../../src/services/userProfileService', () => ({
  getUserProfile: mocks.getUserProfile,
  migrateUserProfile: mocks.migrateUserProfile,
  saveUserProfile: mocks.saveUserProfile,
}));
vi.mock('../../../../../src/services/cloudProfileService', () => ({
  getCloudProfile: mocks.getCloudProfile,
  createCloudProfile: vi.fn(),
  saveCloudProfile: mocks.saveCloudProfile,
}));

import {
  getSyncStatus,
  loadCloudProfileToLocal,
  setSyncStatus,
  syncLocalProfileToCloud,
  syncOnLogin,
} from '../../../../../src/services/syncService';

const profile = { schemaVersion: 'profile.v2', profileId: 'profile:one', revision: 4 };

describe('P3-T08 independent sync failure/idempotency audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSyncStatus('local_only');
    mocks.getUserProfile.mockReturnValue(profile);
    mocks.migrateUserProfile.mockImplementation((value) => value);
    mocks.saveUserProfile.mockImplementation((value) => value);
  });

  test('marks failed upload as error and retries with the same exact user/profile identity', async () => {
    mocks.saveCloudProfile.mockResolvedValueOnce(null).mockResolvedValueOnce({ user_id: 'user:one', profile_data: profile });
    await expect(syncLocalProfileToCloud('user:one')).resolves.toBeNull();
    expect(getSyncStatus()).toBe('error');
    await expect(syncLocalProfileToCloud('user:one')).resolves.toMatchObject({ user_id: 'user:one' });
    expect(getSyncStatus()).toBe('synced');
    expect(mocks.saveCloudProfile.mock.calls).toEqual([
      ['user:one', profile],
      ['user:one', profile],
    ]);
  });

  test('rejects malformed cloud state without reporting synced or writing locally', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.getCloudProfile.mockResolvedValue({ user_id: 'user:one', profile_data: { schemaVersion: 'profile.v999' } });
    mocks.migrateUserProfile.mockImplementation(() => { throw new Error('Unsupported profile schema'); });

    await expect(loadCloudProfileToLocal('user:one')).resolves.toBeNull();
    expect(getSyncStatus()).toBe('error');
    expect(mocks.saveUserProfile).not.toHaveBeenCalled();
  });

  test('does not report a missing-cloud login upload as synced when its upsert fails', async () => {
    mocks.getCloudProfile.mockResolvedValue(null);
    mocks.saveCloudProfile.mockResolvedValue(null);
    await expect(syncOnLogin('user:one')).resolves.toBeNull();
    expect(getSyncStatus()).toBe('error');
  });
});
