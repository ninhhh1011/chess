import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useIsSupabaseConfigured } from '../contexts/AuthContext';
import { getUserProfile, updateDailyTrainingPlan, levelUpIfEligible } from '../services/userProfileService';
import { signOutUser } from '../services/authService';
import { syncLocalProfileToCloud, loadCloudProfileToLocal, handleSyncPrompt } from '../services/syncService';
import SyncStatusBadge from '../components/SyncStatusBadge';

export default function Training() {
  const [profile, setProfile] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [syncAction, setSyncAction] = useState(null);

  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const isSupabaseConfigured = useIsSupabaseConfigured();

  useEffect(() => {
    setProfile(getUserProfile());
  }, [user]);

  async function handleGeneratePlan() {
    updateDailyTrainingPlan();
    setProfile(getUserProfile());
  }

  async function handleSync() {
    if (!user?.id) return;
    setSyncing(true);
    try {
      if (syncAction === 'upload') {
        await syncLocalProfileToCloud(user.id);
      } else if (syncAction === 'download') {
        await loadCloudProfileToLocal(user.id);
      }
      setProfile(getUserProfile());
      setShowSyncPrompt(false);
      setSyncAction(null);
    } catch (error) {
      console.warn('[training] Sync error:', error);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncPromptAction() {
    if (!user?.id) return;
    const result = await handleSyncPrompt(user.id);
    if (result.action === 'prompt') {
      setShowSyncPrompt(true);
    } else {
      setProfile(getUserProfile());
    }
  }

  async function handleLogout() {
    const result = await signOutUser();
    if (result.success) {
      navigate('/');
    }
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-text-primary">Huấn luyện</h1>
        <p className="mt-2 text-text-tertiary">Lộ trình cá nhân hóa và tiến độ học tập</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Level & Plan */}
        <div className="space-y-6">
          <div className="rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 p-6 border border-primary-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-text-tertiary">Level hiện tại</p>
                <h2 className="mt-2 text-3xl font-bold text-primary-500 capitalize">{profile.currentLevel}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-text-tertiary">Trò chơi</p>
                <p className="text-2xl font-bold text-text-primary">{profile.gamesPlayed}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-bg-surface p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-text-tertiary">Lộ trình hôm nay</p>
                <p className="mt-2 text-lg font-bold text-text-primary">
                  {profile.dailyTrainingPlan?.tasks?.length || 0} nhiệm vụ
                </p>
              </div>
              <button
                onClick={handleGeneratePlan}
                className="btn-primary"
              >
                Tạo mới
              </button>
            </div>
            {profile.dailyTrainingPlan?.tasks?.length > 0 && (
              <div className="mt-4 space-y-3">
                {profile.dailyTrainingPlan.tasks.map((task, i) => {
                  const title = typeof task === 'string' ? task : (task.title || task.reason || 'Nhiệm vụ');
                  const reason = typeof task === 'object' ? task.reason : null;
                  return (
                    <div key={task.id || i} className="flex items-start gap-3 rounded-xl bg-bg-elevated px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{title}</p>
                        {reason && reason !== title && (
                          <p className="text-xs text-text-tertiary mt-0.5">{reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Stats & Account */}
        <div className="space-y-6">
          <div className="rounded-xl bg-bg-surface p-6 border border-border">
            <h2 className="text-xl font-bold text-text-primary">Thống kê</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-bg-elevated p-4">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-text-tertiary">Bài tập</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">{profile.exerciseStats.total}</p>
                <p className="text-xs text-text-tertiary">
                  Chính xác: {profile.exerciseStats.accuracy}%
                </p>
              </div>
              <div className="rounded-xl bg-bg-elevated p-4">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-text-tertiary">Khai cuộc</p>
                <p className="mt-2 text-2xl font-bold text-text-primary">{profile.openingStats.totalAttempts}</p>
                <p className="text-xs text-text-tertiary">
                  Hoàn thành: {profile.openingStats.completedOpenings.length}
                </p>
              </div>
            </div>
          </div>

          {/* Account Status Section */}
          <div className="rounded-xl bg-bg-surface p-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-text-tertiary">Trạng thái tài khoản</p>
                <p className="mt-2 text-lg font-bold text-text-primary">
                  {isAuthenticated ? (
                    <span className="flex items-center gap-2">
                      {user?.email}
                      <SyncStatusBadge />
                    </span>
                  ) : (
                    <span className="text-text-tertiary">Chưa đăng nhập</span>
                  )}
                </p>
              </div>
              {isAuthenticated ? (
                <button onClick={handleLogout} className="btn-secondary">
                  Đăng xuất
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary"
                >
                  Đăng nhập
                </button>
              )}
            </div>

            {!isAuthenticated && (
              <p className="mt-4 text-sm text-text-tertiary">
                Đăng nhập để đồng bộ tiến độ giữa nhiều thiết bị.
              </p>
            )}

            {isAuthenticated && showSyncPrompt && (
              <div className="mt-4 rounded-xl bg-primary-500/20 p-4">
                <p className="text-sm text-primary-500">
                  Bạn có muốn đồng bộ tiến độ hiện tại lên tài khoản không?
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => { setSyncAction('upload'); handleSync(); }}
                    disabled={syncing}
                    className="btn-primary flex-1"
                  >
                    {syncing ? 'Đang đồng bộ...' : 'Đồng bộ lên cloud'}
                  </button>
                  <button
                    onClick={() => { setSyncAction('download'); handleSync(); }}
                    disabled={syncing}
                    className="btn-secondary flex-1"
                  >
                    {syncing ? 'Đang tải...' : 'Dùng dữ liệu cloud'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
