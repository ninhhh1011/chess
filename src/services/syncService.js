import { getUserProfile, migrateUserProfile, saveUserProfile } from './userProfileService';
import { getCloudProfile, saveCloudProfile } from './cloudProfileService';

const SYNC_STATUS = {
  LOCAL_ONLY: 'local_only',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error',
};

let currentSyncStatus = SYNC_STATUS.LOCAL_ONLY;
const syncStatusListeners = new Set();

export function getSyncStatus() {
  return currentSyncStatus;
}

export function setSyncStatus(status) {
  if (currentSyncStatus === status) return;
  currentSyncStatus = status;
  syncStatusListeners.forEach((listener) => listener());
}

export function subscribeSyncStatus(listener) {
  syncStatusListeners.add(listener);
  return () => syncStatusListeners.delete(listener);
}

function hasProgress(profile) {
  const openings = profile.openingStats || {};
  const persistence = profile.persistence || {};
  return profile.gamesPlayed > 0
    || (profile.currentLevel && profile.currentLevel !== 'noob')
    || (profile.lessonsCompleted?.length || 0) > 0
    || (profile.exercisesCompleted?.length || 0) > 0
    || ['total', 'correct', 'wrong'].some((field) => (profile.exerciseStats?.[field] || 0) > 0)
    || (openings.totalAttempts || 0) > 0
    || ['completedOpenings', 'practicedOpenings', 'weakOpenings', 'favoriteOpenings']
      .some((field) => (openings[field]?.length || 0) > 0)
    || Boolean(profile.lastTrainingDate)
    || (profile.commonMistakes?.length || 0) > 0
    || (profile.strengths?.length || 0) > 0
    || (profile.weaknesses?.length || 0) > 0
    || Boolean(profile.lastGameResult)
    || (profile.lastGameMovesCount || 0) > 0
    || (persistence.analysisFacts?.length || 0) > 0
    || (persistence.puzzleAttempts?.length || 0) > 0
    || (persistence.gameReviews?.length || 0) > 0
    || (persistence.skillStates?.length || 0) > 0;
}

function markSynced(profile, cloudRow, profileRevisionAtSync = profile.revision) {
  const cloudRevision = Number.isInteger(cloudRow.cloud_revision) ? cloudRow.cloud_revision : 0;
  const lastSyncedAt = cloudRow.updated_at || profile.updatedAt;
  return saveUserProfile({
    ...profile,
    persistence: {
      ...profile.persistence,
      sync: {
        ...profile.persistence.sync,
        cloudRevision,
        profileRevisionAtSync,
        lastSyncedAt,
      },
    },
  }, { preserveTimestamps: true });
}

async function uploadProfile(userId, profile, expectedCloudRevision) {
  const syncTime = new Date().toISOString();
  const nextCloudRevision = (expectedCloudRevision ?? 0) + 1;
  const snapshot = {
    ...profile,
    persistence: {
      ...profile.persistence,
      sync: {
        ...profile.persistence.sync,
        cloudRevision: nextCloudRevision,
        profileRevisionAtSync: profile.revision,
        lastSyncedAt: syncTime,
      },
    },
  };
  const saved = await saveCloudProfile(userId, snapshot, expectedCloudRevision);
  if (!saved) {
    setSyncStatus(expectedCloudRevision === null ? SYNC_STATUS.ERROR : SYNC_STATUS.CONFLICT);
    return null;
  }
  const current = getUserProfile();
  if (current.profileId !== profile.profileId) {
    setSyncStatus(SYNC_STATUS.LOCAL_ONLY);
    return current;
  }
  const local = markSynced(current, saved, profile.revision);
  setSyncStatus(current.revision === profile.revision ? SYNC_STATUS.SYNCED : SYNC_STATUS.LOCAL_ONLY);
  return local;
}

export async function syncLocalProfileToCloud(userId) {
  if (!userId) return null;

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const localProfile = getUserProfile();
    const cloudProfile = await getCloudProfile(userId);
    if (cloudProfile && !Number.isInteger(cloudProfile.cloud_revision)) {
      throw new Error('Cloud sync revision migration is not available');
    }
    return await uploadProfile(userId, localProfile, cloudProfile?.cloud_revision ?? null);
  } catch (err) {
    console.warn('[sync] Sync local to cloud error:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
    return null;
  }
}

export async function loadCloudProfileToLocal(userId) {
  if (!userId) return null;

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const cloudProfile = await getCloudProfile(userId);

    if (cloudProfile?.profile_data) {
      if (!Number.isInteger(cloudProfile.cloud_revision)) {
        throw new Error('Cloud sync revision migration is not available');
      }
      const profile = markSynced(migrateUserProfile(cloudProfile.profile_data), cloudProfile);
      setSyncStatus(SYNC_STATUS.SYNCED);
      return profile;
    }

    setSyncStatus(SYNC_STATUS.LOCAL_ONLY);
    return null;
  } catch (err) {
    console.warn('[sync] Load cloud to local error:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
    return null;
  }
}

export async function syncOnLogin(userId) {
  if (!userId) return null;

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const cloudProfile = await getCloudProfile(userId);

    const localProfile = getUserProfile();
    if (!cloudProfile?.profile_data) {
      return await uploadProfile(userId, localProfile, null);
    }

    if (!Number.isInteger(cloudProfile.cloud_revision)) {
      throw new Error('Cloud sync revision migration is not available');
    }

    const cloudData = migrateUserProfile(cloudProfile.profile_data);
    const baseCloudRevision = localProfile.persistence.sync.cloudRevision ?? null;
    const baseProfileRevision = localProfile.persistence.sync.profileRevisionAtSync ?? null;
    const localChanged = baseProfileRevision === null
      ? hasProgress(localProfile)
      : localProfile.revision > baseProfileRevision;
    const cloudChanged = baseCloudRevision === null
      ? hasProgress(cloudData)
      : cloudProfile.cloud_revision > baseCloudRevision;

    if (localChanged && cloudChanged) {
      setSyncStatus(SYNC_STATUS.CONFLICT);
      return { action: 'conflict', localProfile, cloudProfile };
    }
    if (cloudChanged && !localChanged) {
      const profile = markSynced(cloudData, cloudProfile);
      setSyncStatus(SYNC_STATUS.SYNCED);
      return profile;
    }
    if (localChanged) return await uploadProfile(userId, localProfile, cloudProfile.cloud_revision);

    const profile = markSynced(localProfile, cloudProfile);
    setSyncStatus(SYNC_STATUS.SYNCED);
    return profile;
  } catch (err) {
    console.warn('[sync] Sync on login error:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
    return null;
  }
}
