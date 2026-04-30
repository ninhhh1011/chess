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
        <h1 className="text-4xl font-black text-cream">Huấn luyện</h1>
        <p className="mt-2 text-cream/60">Lộ trình cá nhân hóa và tiến độ học tập</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Level & Plan */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-gold/20 to-amber-700/20 p-6 border border-gold/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cream/45">Level hiện tại</p>
                <h2 className="mt-2 text-3xl font-black text-gold capitalize">{profile.currentLevel}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cream/45">Trò chơi</p>
                <p className="text-2xl font-black text-cream">{profile.gamesPlayed}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-ink/60 p-6 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cream/45">Lộ trình hôm nay</p>
                <p className="mt-2 text-lg font-bold text-cream">
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
                {profile.dailyTrainingPlan.tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-black text-ink">
                      {i + 1}
                    </span>
                    <span className="text-cream">{task}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Stats & Account */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-ink/60 p-6 backdrop-blur-xl border border-white/10">
            <h2 className="text-xl font-black text-cream">Thống kê</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cream/45">Bài tập</p>
                <p className="mt-2 text-2xl font-black text-cream">{profile.exerciseStats.total}</p>
                <p className="text-xs text-cream/60">
                  Chính xác: {profile.exerciseStats.accuracy}%
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cream/45">Khai cuộc</p>
                <p className="mt-2 text-2xl font-black text-cream">{profile.openingStats.totalAttempts}</p>
                <p className="text-xs text-cream/60">
                  Hoàn thành: {profile.openingStats.completedOpenings.length}
                </p>
              </div>
            </div>
          </div>

          {/* Account Status Section */}
          <div className="rounded-3xl bg-ink/60 p-6 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cream/45">Trạng thái tài khoản</p>
                <p className="mt-2 text-lg font-bold text-cream">
                  {isAuthenticated ? (
                    <span className="flex items-center gap-2">
                      {user?.email}
                      <SyncStatusBadge />
                    </span>
                  ) : (
                    <span className="text-cream/60">Chưa đăng nhập</span>
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
              <p className="mt-4 text-sm text-cream/60">
                Đăng nhập để đồng bộ tiến độ giữa nhiều thiết bị.
              </p>
            )}

            {isAuthenticated && showSyncPrompt && (
              <div className="mt-4 rounded-2xl bg-amber-400/20 p-4">
                <p className="text-sm text-amber-400">
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
