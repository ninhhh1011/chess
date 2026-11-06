import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getUserProfile, markLessonCompleted, resetUserProfile } from '../services/userProfileService';
import { getSyncStatus, setSyncStatus, syncLocalProfileToCloud, syncOnLogin } from '../services/syncService';
import { getCloudProfile, saveCloudProfile } from '../services/cloudProfileService';

vi.mock('../services/cloudProfileService', () => ({
  getCloudProfile: vi.fn(),
  saveCloudProfile: vi.fn(),
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const saved = { cloud_revision: 1, updated_at: '2026-10-15T08:00:00.000Z' };

function acknowledged(current, uploaded) {
  return {
    ...current,
    persistence: {
      ...current.persistence,
      sync: {
        ...current.persistence.sync,
        cloudRevision: saved.cloud_revision,
        profileRevisionAtSync: uploaded.revision,
        lastSyncedAt: saved.updated_at,
      },
    },
  };
}

describe('upload acknowledgement with real profile persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    setSyncStatus('local_only');
    getCloudProfile.mockResolvedValue(null);
    saveCloudProfile.mockResolvedValue(saved);
  });

  test.each([syncLocalProfileToCloud, syncOnLogin])('%s acknowledges an unchanged upload without changing its content or revision', async (sync) => {
    const uploaded = markLessonCompleted('lesson:before');

    const result = await sync('user:one');

    expect(result).toEqual(acknowledged(uploaded, uploaded));
    expect(getUserProfile()).toEqual(result);
    expect(getSyncStatus()).toBe('synced');
  });

  test.each(['read', 'save'])('preserves progress written during the cloud %s and uploads it on the next login sync', async (stage) => {
    const uploaded = markLessonCompleted('lesson:before');
    const pending = deferred();
    const saveStarted = deferred();
    if (stage === 'read') getCloudProfile.mockReturnValueOnce(pending.promise);
    saveCloudProfile.mockImplementationOnce(() => {
      saveStarted.resolve();
      return stage === 'save' ? pending.promise : Promise.resolve(saved);
    });

    const syncing = syncLocalProfileToCloud('user:one');
    if (stage === 'save') await saveStarted.promise;
    const current = markLessonCompleted('lesson:during');
    pending.resolve(stage === 'read' ? null : saved);

    expect(await syncing).toEqual(acknowledged(current, uploaded));
    expect(getUserProfile()).toEqual(acknowledged(current, uploaded));
    expect(getSyncStatus()).toBe('local_only');
    const cloudSnapshot = saveCloudProfile.mock.calls[0][1];
    expect(cloudSnapshot.lessonsCompleted).toEqual(['lesson:before']);

    getCloudProfile.mockResolvedValue({ ...saved, profile_data: cloudSnapshot });
    saveCloudProfile.mockResolvedValue({ ...saved, cloud_revision: 2 });
    await syncOnLogin('user:one');

    expect(saveCloudProfile).toHaveBeenLastCalledWith('user:one', expect.objectContaining({
      lessonsCompleted: current.lessonsCompleted,
      revision: current.revision,
    }), 1);
    expect(getUserProfile().persistence.sync).toMatchObject({
      cloudRevision: 2, profileRevisionAtSync: current.revision,
    });
    expect(getSyncStatus()).toBe('synced');
  });

  test('login upload preserves progress written while the cloud save waits', async () => {
    const uploaded = markLessonCompleted('lesson:before');
    const pending = deferred();
    const saveStarted = deferred();
    saveCloudProfile.mockImplementationOnce(() => {
      saveStarted.resolve();
      return pending.promise;
    });
    const syncing = syncOnLogin('user:one');
    await saveStarted.promise;
    const current = markLessonCompleted('lesson:during');
    pending.resolve(saved);

    expect(await syncing).toEqual(acknowledged(current, uploaded));
    expect(getUserProfile()).toEqual(acknowledged(current, uploaded));
    expect(getSyncStatus()).toBe('local_only');
  });

  test.each(['read', 'save'])('preserves a reset profile without attaching the old acknowledgement during cloud %s', async (stage) => {
    const uploaded = markLessonCompleted('lesson:before');
    const pending = deferred();
    const saveStarted = deferred();
    if (stage === 'read') getCloudProfile.mockReturnValueOnce(pending.promise);
    saveCloudProfile.mockImplementationOnce(() => {
      saveStarted.resolve();
      return stage === 'save' ? pending.promise : Promise.resolve(saved);
    });
    const syncing = syncLocalProfileToCloud('user:one');
    if (stage === 'save') await saveStarted.promise;
    const current = resetUserProfile();
    expect(current.profileId).not.toBe(uploaded.profileId);
    pending.resolve(stage === 'read' ? null : saved);

    expect(await syncing).toEqual(current);
    expect(getUserProfile()).toEqual(current);
    expect(getSyncStatus()).toBe('local_only');
  });

  test.each(['failed', 'rejected'])('%s save leaves newer local progress and its acknowledgement untouched', async (failure) => {
    markLessonCompleted('lesson:before');
    const pending = deferred();
    const saveStarted = deferred();
    saveCloudProfile.mockImplementationOnce(() => {
      saveStarted.resolve();
      return pending.promise;
    });
    const syncing = syncLocalProfileToCloud('user:one');
    await saveStarted.promise;
    const current = markLessonCompleted('lesson:during');
    if (failure === 'rejected') pending.reject(new Error('offline'));
    else pending.resolve(null);

    expect(await syncing).toBeNull();
    expect(getUserProfile()).toEqual(current);
    expect(getSyncStatus()).toBe('error');
  });
});
