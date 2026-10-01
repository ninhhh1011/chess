import { useState, useEffect } from 'react';
import ExerciseBoard from '../components/ExerciseBoard';
import { exercises } from '../data/exercises';
import { validateExerciseRecord } from '../services/exerciseValidator';
import { CORPUS_AVAILABILITY, loadProductionCorpus } from '../services/corpusLoader';
import { getUserProfile, recordPuzzleAttemptEvent, updateExerciseResult } from '../services/userProfileService';
import { AppButton } from '@/ui/AppButton';
import { ChevronRight } from 'lucide-react';

import { AppSpinner } from '@/ui/AppSpinner';
import { AppSurface } from '@/ui/AppSurface';

import { AppCard } from '@/ui/AppCard';

const validExercises = exercises.filter((exercise) => validateExerciseRecord(exercise).valid);

export default function Exercises() {
  const [index, setIndex] = useState(0);
  const [availableExercises, setAvailableExercises] = useState(validExercises);
  const [corpusStatus, setCorpusStatus] = useState(CORPUS_AVAILABILITY);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setProfile(getUserProfile());
        const corpus = await loadProductionCorpus();
        if (!active) return;
        setCorpusStatus(corpus);
        if (corpus.available && corpus.puzzles.length) setAvailableExercises(corpus.puzzles);
      } catch {
        if (active) setError('Không thể tải dữ liệu người dùng');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  function handleResult(result) {
    try {
      const updatedProfile = updateExerciseResult(result);
      setProfile(updatedProfile);
    } catch (err) {
      console.error('[Exercises] Error updating result:', err);
    }
  }

  function handleAttempt(event) {
    try {
      setProfile(recordPuzzleAttemptEvent(event));
    } catch (err) {
      console.error('[Exercises] Error recording attempt:', err);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl py-16 flex flex-col items-center justify-center gap-3">
        <AppSpinner size="lg" />
        <p className="text-xs font-semibold text-[var(--app-muted)]">Đang tải bài tập...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl py-8">
        <AppCard className="p-8 text-center space-y-3 border-[var(--app-danger)]/30">
          <AppCard.Title className="text-xl font-bold text-[var(--app-danger)]">Đã xảy ra lỗi</AppCard.Title>
          <AppCard.Description className="text-xs text-[var(--app-muted)]">{error}</AppCard.Description>
        </AppCard>
      </div>
    );
  }

  if (availableExercises.length === 0) {
    return (
      <div className="mx-auto max-w-6xl py-8">
        <AppCard className="p-8 text-center space-y-3">
          <AppCard.Title className="text-xl font-bold text-[var(--app-foreground)]">Chưa có bài tập</AppCard.Title>
          <AppCard.Description className="text-xs text-[var(--app-muted)]">
            Hiện tại chưa có bài tập nào khả dụng. Vui lòng quay lại sau.
          </AppCard.Description>
        </AppCard>
      </div>
    );
  }

  const exercise = availableExercises[index];

  if (!exercise) {
    return (
      <div className="mx-auto max-w-6xl py-8">
        <AppCard className="p-8 text-center space-y-4">
          <AppCard.Title className="text-xl font-bold text-[var(--app-foreground)]">Không tìm thấy bài tập</AppCard.Title>
          <AppCard.Description className="text-xs text-[var(--app-muted)]">
            Không tìm thấy bài tập số #{index + 1}
          </AppCard.Description>
          <AppCard.Content className="p-0">
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setIndex(0)}
            >
              Quay về bài đầu
            </AppButton>
          </AppCard.Content>
        </AppCard>
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
            Bài {index + 1}/{availableExercises.length}
            {profile?.exerciseStats ? ` · Độ chính xác: ${profile.exerciseStats.accuracy}%` : ''}
          </p>
        </div>
        <AppButton
          variant="primary"
          size="sm"
          onClick={() => setIndex((index + 1) % availableExercises.length)}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Bài tiếp theo
        </AppButton>
      </div>

      {!corpusStatus.available && (
        <AppSurface variant="raised" radius="sm" className="px-4 py-3 text-xs text-[var(--app-muted)]" role="status">
          Kho bài tập mở rộng chưa khả dụng. Bạn đang luyện với {availableExercises.length} bài tập tích hợp, không phải corpus bên ngoài.
        </AppSurface>
      )}

      {corpusStatus.available && (
        <AppSurface variant="raised" radius="sm" className="px-4 py-3 text-xs text-[var(--app-muted)]" role="status">
          Nguồn: <a className="underline" href={exercise.sourceUrl} target="_blank" rel="noreferrer">Lichess</a>
          {' · '}Giấy phép: <a className="underline" href={corpusStatus.licenseUrl} target="_blank" rel="noreferrer">{corpusStatus.licenseId}</a>
          {corpusStatus.datasetVersion ? ` · Dữ liệu ${corpusStatus.datasetVersion}` : ''}
        </AppSurface>
      )}

      <ExerciseBoard
        key={exercise.id}
        exercise={exercise}
        onResult={handleResult}
        onAttempt={exercise.sourcePuzzleId ? handleAttempt : undefined}
      />
    </div>
  );
}
