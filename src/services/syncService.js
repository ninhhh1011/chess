import { getUserProfile, migrateUserProfile, saveUserProfile } from './userProfileService';
import { getCloudProfile, createCloudProfile, saveCloudProfile } from './cloudProfileService';

const SYNC_STATUS = {
  LOCAL_ONLY: 'local_only',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
};

let currentSyncStatus = SYNC_STATUS.LOCAL_ONLY;

export function getSyncStatus() {
  return currentSyncStatus;
}

export function setSyncStatus(status) {
  currentSyncStatus = status;
}

export async function syncLocalProfileToCloud(userId) {
  if (!userId) return null;

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const localProfile = getUserProfile();
    const saved = await saveCloudProfile(userId, localProfile);

    if (saved) {
      setSyncStatus(SYNC_STATUS.SYNCED);
      return saved;
    }

    setSyncStatus(SYNC_STATUS.ERROR);
    return null;
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
      const profile = saveUserProfile(migrateUserProfile(cloudProfile.profile_data), { preserveTimestamps: true });
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

export function mergeLocalAndCloudProfile(localProfile, cloudProfile) {
  const local = migrateUserProfile(localProfile);
  if (!cloudProfile?.profile_data) return local;
  const cloud = migrateUserProfile(cloudProfile.profile_data);

  const localDate = new Date(local.updatedAt);
  const cloudDate = new Date(cloudProfile.updated_at || cloud.updatedAt);

  if (cloudDate > localDate) {
    const updatedAt = cloudDate.toISOString();
    return migrateUserProfile({
      ...cloud,
      updatedAt,
      persistence: { ...cloud.persistence, sync: { ...cloud.persistence.sync, updatedAt } },
    });
  }

  return local;
}

export function shouldAskToSync(localProfile, cloudProfile) {
  if (!cloudProfile?.profile_data) return false;
  const local = migrateUserProfile(localProfile);
  const cloud = migrateUserProfile(cloudProfile.profile_data);

  const localDate = new Date(local.updatedAt);
  const cloudDate = new Date(cloudProfile.updated_at || cloud.updatedAt);

  const hasLocalProgress = local.gamesPlayed > 0 || local.lessonsCompleted.length > 0;
  const hasCloudProgress = cloud.gamesPlayed > 0 || cloud.lessonsCompleted.length > 0;

  return hasLocalProgress && hasCloudProgress && Math.abs(cloudDate - localDate) > 60000;
}

export async function handleSyncPrompt(userId) {
  const localProfile = getUserProfile();
  const cloudProfile = await getCloudProfile(userId);

  if (!cloudProfile?.profile_data) {
    const saved = await syncLocalProfileToCloud(userId);
    return saved
      ? { action: 'created', profile: localProfile }
      : { action: 'error', profile: localProfile };
  }

  if (shouldAskToSync(localProfile, cloudProfile)) {
    return { action: 'prompt', localProfile, cloudProfile };
  }

  const merged = mergeLocalAndCloudProfile(localProfile, cloudProfile);
  saveUserProfile(merged);
  return { action: 'merged', profile: merged };
}

export async function syncOnLogin(userId) {
  if (!userId) return null;

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const cloudProfile = await getCloudProfile(userId);

    if (!cloudProfile?.profile_data) {
      return await syncLocalProfileToCloud(userId);
    } else {
      const localProfile = getUserProfile();
      const merged = mergeLocalAndCloudProfile(localProfile, cloudProfile);
      saveUserProfile(merged);
      setSyncStatus(SYNC_STATUS.SYNCED);
      return merged;
    }
  } catch (err) {
    console.warn('[sync] Sync on login error:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
    return null;
  }
}

export async function syncOnLogout() {
  setSyncStatus(SYNC_STATUS.LOCAL_ONLY);
}

export async function syncOnAction(userId, actionType) {
  if (!userId) return null;

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const localProfile = getUserProfile();
    const saved = await saveCloudProfile(userId, localProfile);
    setSyncStatus(saved ? SYNC_STATUS.SYNCED : SYNC_STATUS.ERROR);
    return saved || null;
  } catch (err) {
    console.warn('[sync] Sync on action error:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
    return null;
  }
}
