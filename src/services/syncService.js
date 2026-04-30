import { getUserProfile, saveUserProfile } from './userProfileService';
import { getCloudProfile, createCloudProfile, saveCloudProfile } from './cloudProfileService';
import { useAuth } from '../contexts/AuthContext';

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
      saveUserProfile(cloudProfile.profile_data);
      setSyncStatus(SYNC_STATUS.SYNCED);
      return cloudProfile.profile_data;
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
  if (!cloudProfile?.profile_data) return localProfile;

  const localDate = new Date(localProfile?.updatedAt || 0);
  const cloudDate = new Date(cloudProfile?.updated_at || 0);

  if (cloudDate > localDate) {
    return { ...cloudProfile.profile_data, updatedAt: cloudDate.toISOString() };
  }

  return localProfile;
}

export function shouldAskToSync(localProfile, cloudProfile) {
  if (!cloudProfile?.profile_data) return false;

  const localDate = new Date(localProfile?.updatedAt || 0);
  const cloudDate = new Date(cloudProfile?.updated_at || 0);

  const hasLocalProgress = localProfile.gamesPlayed > 0 || localProfile.lessonsCompleted.length > 0;
  const hasCloudProgress = cloudProfile.games_played > 0 || cloudProfile.profile_data?.lessonsCompleted?.length > 0;

  return hasLocalProgress && hasCloudProgress && Math.abs(cloudDate - localDate) > 60000;
}

export async function handleSyncPrompt(userId) {
  const localProfile = getUserProfile();
  const cloudProfile = await getCloudProfile(userId);

  if (!cloudProfile?.profile_data) {
    await syncLocalProfileToCloud(userId);
    return { action: 'created', profile: localProfile };
  }

  if (shouldAskToSync(localProfile, cloudProfile)) {
    return { action: 'prompt', localProfile, cloudProfile };
  }

  const merged = mergeLocalAndCloudProfile(localProfile, cloudProfile);
  saveUserProfile(merged);
  return { action: 'merged', profile: merged };
}

export async function syncOnLogin(userId) {
  if (!userId) return;

  setSyncStatus(SYNC_STATUS.SYNCING);

  try {
    const cloudProfile = await getCloudProfile(userId);

    if (!cloudProfile?.profile_data) {
      await syncLocalProfileToCloud(userId);
    } else {
      const localProfile = getUserProfile();
      const merged = mergeLocalAndCloudProfile(localProfile, cloudProfile);
      saveUserProfile(merged);
    }

    setSyncStatus(SYNC_STATUS.SYNCED);
  } catch (err) {
    console.warn('[sync] Sync on login error:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
  }
}

export async function syncOnLogout() {
  setSyncStatus(SYNC_STATUS.LOCAL_ONLY);
}

export async function syncOnAction(userId, actionType) {
  if (!userId) return;

  try {
    const localProfile = getUserProfile();
    await saveCloudProfile(userId, localProfile);
    setSyncStatus(SYNC_STATUS.SYNCED);
  } catch (err) {
    console.warn('[sync] Sync on action error:', err);
    setSyncStatus(SYNC_STATUS.ERROR);
  }
}
