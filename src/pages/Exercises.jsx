import { useState, useEffect } from 'react';
import ExerciseBoard from '../components/ExerciseBoard';
import { exercises } from '../data/exercises';
import { getUserProfile, updateExerciseResult } from '../services/userProfileService';
import { AppButton } from '@/ui/AppButton';
import { ChevronRight } from 'lucide-react';

export default function Exercises() {
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const userProfile = getUserProfile();
      setProfile(userProfile);
      setLoading(false);
    } catch {
      setError('Không thể tải dữ liệu người dùng');
      setLoading(false);
    }
  }, []);

  function handleResult(result) {
    try {
      const updatedProfile = updateExerciseResult(result);
      setProfile(updatedProfile);
    } catch (err) {
      console.error('[Exercises] Error updating result:', err);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl py-12 text-center">
        <p className="text-sm font-semibold text-[var(--app-muted)]">Đang tải bài tập...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl py-8">
        <div className="rounded-[12px] border border-[var(--app-danger)]/30 bg-[var(--app-surface)] p-8 text-center space-y-3">
          <h1 className="text-xl font-bold text-[var(--app-danger)]">Đã xảy ra lỗi</h1>
          <p className="text-xs text-[var(--app-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <div className="mx-auto max-w-6xl py-8">
        <div className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center space-y-3">
          <h1 className="text-xl font-bold text-[var(--app-foreground)]">Chưa có bài tập</h1>
          <p className="text-xs text-[var(--app-muted)]">Hiện tại chưa có bài tập nào khả dụng. Vui lòng quay lại sau.</p>
        </div>
      </div>
    );
  }

  const exercise = exercises[index];

  if (!exercise) {
    return (
      <div className="mx-auto max-w-6xl py-8">
        <div className="rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-[var(--app-foreground)]">Không tìm thấy bài tập</h1>
          <p className="text-xs text-[var(--app-muted)]">Không tìm thấy bài tập số #{index + 1}</p>
          <AppButton
            variant="primary"
            size="sm"
            onClick={() => setIndex(0)}
          >
            Quay về bài đầu
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2 sm:py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--app-foreground)]">
            Bài tập chiến thuật
          </h1>
          <p className="text-xs sm:text-sm text-[var(--app-muted)]">
            Bài {index + 1}/{exercises.length}
            {profile?.exerciseStats ? ` · Độ chính xác: ${profile.exerciseStats.accuracy}%` : ''}
          </p>
        </div>
        <AppButton
          variant="primary"
          size="sm"
          onClick={() => setIndex((index + 1) % exercises.length)}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Bài tiếp theo
        </AppButton>
      </div>

      <ExerciseBoard key={index} exercise={exercise} onResult={handleResult} />
    </div>
  );
}
