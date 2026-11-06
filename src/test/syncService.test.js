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
  subscribeSyncStatus,
  setSyncStatus,
  syncLocalProfileToCloud,
  syncOnLogin,
} from '../services/syncService';

const profile = {
  profileId: 'profile:local', revision: 3, updatedAt: '2026-09-06T08:00:00.000Z',
  gamesPlayed: 1, lessonsCompleted: [], persistence: { sync: { revision: 3 } },
};
const saved = {
  id: 'row:one', user_id: 'user:one', cloud_revision: 1,
  updated_at: '2026-10-07T00:00:00.000Z', profile_data: profile,
};

describe('cloud sync status and retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSyncStatus('local_only');
    mocks.getUserProfile.mockReturnValue(profile);
  });

  test('does not report synced when an action adapter returns no row', async () => {
    mocks.saveCloudProfile.mockResolvedValue(null);

    await expect(syncLocalProfileToCloud('user:one')).resolves.toBeNull();
    expect(getSyncStatus()).toBe('error');
  });

  test('returns each successful retry while reusing the same user identity', async () => {
    mocks.saveCloudProfile.mockResolvedValue(saved);

    await expect(Promise.all([
      syncLocalProfileToCloud('user:one'),
      syncLocalProfileToCloud('user:one'),
    ])).resolves.toHaveLength(2);
    expect(mocks.saveCloudProfile).toHaveBeenNthCalledWith(1, 'user:one', expect.objectContaining({
      ...profile,
      persistence: expect.objectContaining({ sync: expect.objectContaining({ cloudRevision: 1, profileRevisionAtSync: 3 }) }),
    }), null);
    expect(mocks.saveCloudProfile).toHaveBeenNthCalledWith(2, 'user:one', expect.any(Object), null);
    expect(getSyncStatus()).toBe('synced');
  });

  test('does not overwrite a failed login upload with a synced status', async () => {
    mocks.getCloudProfile.mockResolvedValue(null);
    mocks.saveCloudProfile.mockResolvedValue(null);

    await expect(syncOnLogin('user:one')).resolves.toBeNull();
    expect(getSyncStatus()).toBe('error');
  });

  test('adopts a cloud-only profile when the local profile has no progress', async () => {
    const emptyProfile = {
      ...profile, revision: 0, gamesPlayed: 0, lessonsCompleted: [],
      persistence: { sync: { revision: 0, cloudRevision: null, profileRevisionAtSync: null } },
    };
    const cloud = {
      ...saved,
      cloud_revision: 4,
      updated_at: '2026-10-01T08:00:00.000Z',
      profile_data: { ...emptyProfile, gamesPlayed: 2 },
    };
    mocks.getUserProfile.mockReturnValue(emptyProfile);
    mocks.getCloudProfile.mockResolvedValue(cloud);

    await expect(syncOnLogin('user:one')).resolves.toMatchObject({ gamesPlayed: 2 });

    expect(mocks.saveCloudProfile).not.toHaveBeenCalled();
    expect(mocks.saveUserProfile).toHaveBeenCalledWith(expect.objectContaining({
      gamesPlayed: 2,
      persistence: { sync: expect.objectContaining({ cloudRevision: 4, profileRevisionAtSync: 0 }) },
    }), { preserveTimestamps: true });
  });

  test('surfaces divergent local and cloud profiles instead of choosing by timestamp', async () => {
    mocks.getCloudProfile.mockResolvedValue({
      ...saved,
      cloud_revision: 2,
      profile_data: { ...profile, updatedAt: '2026-10-01T08:00:00.000Z', gamesPlayed: 2 },
    });

    const result = await syncOnLogin('user:one');
    expect(result.action).toBe('conflict');
    expect(result.localProfile).toBe(profile);

    expect(mocks.saveCloudProfile).not.toHaveBeenCalled();
    expect(mocks.saveUserProfile).not.toHaveBeenCalled();
    expect(getSyncStatus()).toBe('conflict');
  });

  test.each([
    ['exercise stats', { exerciseStats: { total: 1, correct: 1, wrong: 0, accuracy: 100 } }],
    ['opening stats', { openingStats: { totalAttempts: 1, completedOpenings: [], practicedOpenings: ['italian'], weakOpenings: [], favoriteOpenings: [] } }],
    ['last training date', { lastTrainingDate: '2026-10-01T08:00:00.000Z' }],
    ['legacy profile fields', { commonMistakes: ['weak_opening'], currentLevel: 'beginner' }],
    ...['analysisFacts', 'puzzleAttempts', 'gameReviews', 'skillStates'].map((field) => [
      `persisted ${field}`, { persistence: { sync: { revision: 0 }, [field]: [{}] } },
    ]),
  ])('surfaces a no-base conflict when local %s meets cloud progress', async (_label, localProgress) => {
    const localProfile = {
      ...profile, revision: 0, gamesPlayed: 0, lessonsCompleted: [], exercisesCompleted: [],
      persistence: { sync: { revision: 0, cloudRevision: null, profileRevisionAtSync: null } },
      ...localProgress,
    };
    mocks.getUserProfile.mockReturnValue(localProfile);
    mocks.getCloudProfile.mockResolvedValue({
      ...saved,
      cloud_revision: 4,
      profile_data: { ...profile, gamesPlayed: 2 },
    });

    const result = await syncOnLogin('user:one');
    expect(result.action).toBe('conflict');
    expect(result.localProfile).toBe(localProfile);

    expect(mocks.saveCloudProfile).not.toHaveBeenCalled();
    expect(mocks.saveUserProfile).not.toHaveBeenCalled();
    expect(getSyncStatus()).toBe('conflict');
  });

  test('does not treat generated recommendations or plans as progress without a base revision', async () => {
    const localProfile = {
      ...profile, revision: 1, gamesPlayed: 0, lessonsCompleted: [], exercisesCompleted: [],
      recommendedLessons: [{ id: 'generated' }], dailyTrainingPlan: { planId: 'generated' },
      recommendedExercises: [{ id: 'generated' }], tasks: [{ id: 'generated' }],
      persistence: { sync: { revision: 1, cloudRevision: null, profileRevisionAtSync: null }, trainingPlans: [{ planId: 'generated' }] },
    };
    mocks.getUserProfile.mockReturnValue(localProfile);
    mocks.getCloudProfile.mockResolvedValue({
      ...saved, cloud_revision: 4, profile_data: { ...profile, gamesPlayed: 2 },
    });

    await expect(syncOnLogin('user:one')).resolves.toMatchObject({ gamesPlayed: 2 });
    expect(mocks.saveCloudProfile).not.toHaveBeenCalled();
  });

  test('detects progress in a legacy cloud profile when local progress has no base revision', async () => {
    const localProfile = {
      ...profile, revision: 0, gamesPlayed: 0, lessonsCompleted: [], exercisesCompleted: [],
      openingStats: { totalAttempts: 1 },
      persistence: { sync: { revision: 0, cloudRevision: null, profileRevisionAtSync: null } },
    };
    mocks.getUserProfile.mockReturnValue(localProfile);
    mocks.migrateUserProfile.mockImplementation((legacy) => legacy);
    mocks.getCloudProfile.mockResolvedValue({
      ...saved, cloud_revision: 4,
      profile_data: { schemaVersion: 'profile.v1', exerciseStats: { total: 2, correct: 1, wrong: 1 }, gamesPlayed: 0 },
    });

    const result = await syncOnLogin('user:one');
    expect(result.action).toBe('conflict');
    expect(result.localProfile).toBe(localProfile);

    expect(mocks.saveCloudProfile).not.toHaveBeenCalled();
    expect(mocks.saveUserProfile).not.toHaveBeenCalled();
  });

  test('does not upload local data when the cloud read fails', async () => {
    mocks.getCloudProfile.mockRejectedValue(new Error('network unavailable'));

    await expect(syncOnLogin('user:one')).resolves.toBeNull();

    expect(mocks.saveCloudProfile).not.toHaveBeenCalled();
    expect(getSyncStatus()).toBe('error');
  });

  test('notifies subscribers when sync status changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSyncStatus(listener);

    setSyncStatus('syncing');
    expect(listener).toHaveBeenCalledOnce();
    expect(getSyncStatus()).toBe('syncing');

    unsubscribe();
    setSyncStatus('synced');
    expect(listener).toHaveBeenCalledOnce();
  });

  test('does not report a cloud profile created when upload fails', async () => {
    mocks.getCloudProfile.mockResolvedValue(null);
    mocks.saveCloudProfile.mockResolvedValue(null);
    await expect(syncOnLogin('user:one')).resolves.toBeNull();
    expect(getSyncStatus()).toBe('error');
  });
});
