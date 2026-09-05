import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateDailyTrainingPlan } from '../services/userProfileService';
import { signOutUser } from '../services/authService';
import { syncLocalProfileToCloud, loadCloudProfileToLocal, handleSyncPrompt } from '../services/syncService';
import SyncStatusBadge from '../components/SyncStatusBadge';
import { AppButton } from '@/ui/AppButton';
import { AppProgress } from '@/ui/AppProgress';
import {
  CheckCircle2,
  Circle,
  BookOpen,
  Puzzle,
  Swords,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Award,
  LogOut,
  Target,
} from 'lucide-react';

export default function Training() {
  const [profile, setProfile] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  const [syncAction, setSyncAction] = useState(null);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    setProfile(getUserProfile());
  }, [user]);

  function handleGeneratePlan() {
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

  async function handleLogout() {
    const result = await signOutUser();
    if (result.success) {
      navigate('/');
    }
  }

  if (!profile) return null;

  const rawTasks = profile.dailyTrainingPlan?.tasks || [];
  const completedCount = rawTasks.filter((t) => typeof t === 'object' && t.completed).length;
  const progressPercent = rawTasks.length > 0 ? Math.round((completedCount / rawTasks.length) * 100) : 0;

  const getTaskBadge = (type) => {
    switch (type) {
      case 'lesson':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-accent)] bg-[var(--app-accent-soft)] px-2 py-0.5 rounded-[4px]">
            <BookOpen className="h-3 w-3" />
            <span>Bài học</span>
          </span>
        );
      case 'exercise':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-success)] bg-[var(--app-surface)] border border-[var(--app-border)] px-2 py-0.5 rounded-[4px]">
            <Puzzle className="h-3 w-3" />
            <span>Bài tập</span>
          </span>
        );
      case 'challenge':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-copper)] bg-[var(--app-copper-soft)] px-2 py-0.5 rounded-[4px]">
            <Swords className="h-3 w-3" />
            <span>Thực chiến</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--app-muted)] bg-[var(--app-surface)] px-2 py-0.5 rounded-[4px]">
            <Target className="h-3 w-3" />
            <span>Rèn luyện</span>
          </span>
        );
    }
  };

  const handleTaskAction = (task) => {
    if (task.type === 'lesson') {
      navigate('/learn');
    } else if (task.type === 'exercise') {
      navigate('/exercises');
    } else if (task.type === 'challenge') {
      navigate('/play');
    } else {
      navigate('/exercises');
    }
  };

  const accuracy = profile.exerciseStats?.accuracy || 0;
  const totalExercises = profile.exerciseStats?.total || 0;
  const completedOpenings = profile.openingStats?.completedOpenings?.length || 0;

  return (
    <div className="space-y-8 py-2 sm:py-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--app-accent)]">
              Tiến độ & Lộ trình
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--app-foreground)]">
            Kế hoạch rèn luyện
          </h1>
          <p className="text-xs sm:text-sm text-[var(--app-muted)]">
            Lộ trình cá nhân hóa dựa trên kết quả ván đấu và bài tập thực tế của bạn
          </p>
        </div>

        <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[var(--app-border)] pt-3 sm:pt-0 sm:pl-6 shrink-0">
          <div>
            <span className="text-[11px] font-semibold text-[var(--app-muted)] block">Cấp độ hiện tại</span>
            <span className="text-xl font-extrabold capitalize text-[var(--app-accent)]">
              {profile.currentLevel}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[var(--app-muted)] block">Ván cờ đã chơi</span>
            <span className="text-xl font-extrabold font-mono text-[var(--app-foreground)]">
              {profile.gamesPlayed}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Left Column (Tasks), Right Column (Skill Progress & Sync) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Kế hoạch hôm nay */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--app-accent)]" />
                <h2 className="text-base font-bold text-[var(--app-foreground)]">
                  Nhiệm vụ hôm nay
                </h2>
              </div>
              <AppButton
                size="sm"
                variant="outline"
                onClick={handleGeneratePlan}
                leftIcon={<RefreshCw className="h-3 w-3" />}
              >
                Tạo mới
              </AppButton>
            </div>

            {/* AppProgress */}
            <AppProgress
              value={progressPercent}
              showValue
              valueLabel={`${completedCount}/${rawTasks.length} hoàn thành (${progressPercent}%)`}
              variant="pine"
              size="md"
            />
          </div>

          {/* Canonical Tasks List */}
          <div className="space-y-2.5">
            {rawTasks.length > 0 ? (
              rawTasks.map((task, i) => {
                const title = typeof task === 'string' ? task : (task.title || task.reason || 'Nhiệm vụ');
                const reason = typeof task === 'object' ? task.reason : null;
                const skillTag = typeof task === 'object' ? task.skillTag : null;
                const type = typeof task === 'object' ? task.type : 'general';
                const isCompleted = typeof task === 'object' && Boolean(task.completed);

                return (
                  <div
                    key={task.id || i}
                    className={`rounded-[10px] border p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? 'border-[var(--app-border)] bg-[var(--app-surface)] opacity-80'
                        : 'border-[var(--app-border)] bg-[var(--app-surface-raised)] hover:border-[var(--app-accent)]/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] text-xs font-mono font-bold text-[var(--app-muted)]">
                        {isCompleted ? <CheckCircle2 className="h-4 w-4 text-[var(--app-success)]" /> : i + 1}
                      </span>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getTaskBadge(type)}
                          {skillTag && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-muted)]">
                              {skillTag}
                            </span>
                          )}
                        </div>

                        <h3 className={`text-sm font-bold ${isCompleted ? 'line-through text-[var(--app-muted)]' : 'text-[var(--app-foreground)]'}`}>
                          {title}
                        </h3>

                        {reason && reason !== title && (
                          <p className="text-xs text-[var(--app-muted)] leading-relaxed">
                            {reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 pl-9 sm:pl-0">
                      <AppButton
                        variant={isCompleted ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleTaskAction(task)}
                      >
                        {isCompleted ? 'Ôn lại' : 'Thực hiện'}
                      </AppButton>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-center text-xs text-[var(--app-muted)]">
                Chưa có nhiệm vụ. Nhấn "Tạo mới" để tạo lộ trình hôm nay.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Skill Progress & Account */}
        <div className="lg:col-span-5 space-y-4">
          {/* Skill Performance Overview */}
          <div className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
              <h3 className="text-sm font-bold text-[var(--app-foreground)]">
                Chỉ số năng lực
              </h3>
              <span className="text-xs font-semibold text-[var(--app-success)] flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Thực tế</span>
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Tactical Accuracy */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--app-foreground)]">Độ chính xác bài tập</span>
                  <span className="font-mono text-xs font-bold text-[var(--app-accent)]">{accuracy}%</span>
                </div>
                <AppProgress value={accuracy} variant="pine" size="sm" />
                <div className="text-[10px] text-[var(--app-subtle)] text-right">
                  {totalExercises} bài đã giải
                </div>
              </div>

              {/* Opening Mastery */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--app-foreground)]">Hoàn thành khai cuộc</span>
                  <span className="font-mono text-xs font-bold text-[var(--app-copper)]">{completedOpenings} thế cờ</span>
                </div>
                <AppProgress value={Math.min(100, completedOpenings * 10)} variant="copper" size="sm" />
                <div className="text-[10px] text-[var(--app-subtle)] text-right">
                  {profile.openingStats?.totalAttempts || 0} lượt luyện
                </div>
              </div>
            </div>
          </div>

          {/* Account & Sync Status Section */}
          <div className="rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--app-foreground)]">Tài khoản & Đồng bộ</h3>
                <p className="text-xs text-[var(--app-muted)] mt-0.5">
                  {isAuthenticated ? (
                    <span className="flex items-center gap-1.5">
                      <span>{user?.email}</span>
                      <SyncStatusBadge />
                    </span>
                  ) : (
                    'Lưu trữ cục bộ trên trình duyệt'
                  )}
                </p>
              </div>

              {isAuthenticated ? (
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<LogOut className="h-3.5 w-3.5" />}
                >
                  Đăng xuất
                </AppButton>
              ) : (
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Đăng nhập
                </AppButton>
              )}
            </div>

            {!isAuthenticated && (
              <p className="text-[11px] text-[var(--app-subtle)] leading-relaxed">
                Đăng nhập để tự động sao lưu dữ liệu và lộ trình bài tập lên đám mây.
              </p>
            )}

            {isAuthenticated && showSyncPrompt && (
              <div className="rounded-[8px] bg-[var(--app-surface)] p-3 border border-[var(--app-border)] space-y-2">
                <p className="text-xs text-[var(--app-foreground)]">
                  Phát hiện dữ liệu cần đồng bộ lên tài khoản:
                </p>
                <div className="flex gap-2">
                  <AppButton
                    size="sm"
                    variant="primary"
                    onClick={() => { setSyncAction('upload'); handleSync(); }}
                    disabled={syncing}
                    className="flex-1"
                  >
                    {syncing ? 'Đang đồng bộ...' : 'Đồng bộ lên cloud'}
                  </AppButton>
                  <AppButton
                    size="sm"
                    variant="secondary"
                    onClick={() => { setSyncAction('download'); handleSync(); }}
                    disabled={syncing}
                    className="flex-1"
                  >
                    {syncing ? 'Đang tải...' : 'Tải về'}
                  </AppButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
