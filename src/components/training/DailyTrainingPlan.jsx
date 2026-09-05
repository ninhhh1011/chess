import { AppButton } from '../../ui';

/**
 * Daily Training Plan Component
 *
 * Displays training plan using canonical tasks format:
 * @typedef {Object} TrainingTask
 * @property {'lesson'|'exercise'|'opening'|'challenge'} type
 * @property {string} id
 * @property {string} title
 * @property {string} reason
 * @property {string} [skillTag]
 */
export default function DailyTrainingPlan({ plan, onRegenerate, onStartLesson, onStartExercises, onStartOpening }) {
  const tasks = plan?.tasks || [];

  // Group tasks by type
  const lessons = tasks.filter(t => t.type === 'lesson');
  const exercises = tasks.filter(t => t.type === 'exercise');
  const openings = tasks.filter(t => t.type === 'opening');
  const challenges = tasks.filter(t => t.type === 'challenge');

  // Fallback content
  const firstLesson = lessons[0];
  const firstChallenge = challenges[0];

  return (
    <article className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--app-accent)]">Lộ trình hôm nay</p>
          <h2 className="mt-1 text-2xl font-bold text-[var(--app-foreground)]">Hôm nay bạn nên luyện</h2>
        </div>
        <AppButton size="sm" variant="secondary" onClick={onRegenerate}>
          Tạo lại lộ trình hôm nay
        </AppButton>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {/* Lesson */}
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4">
          <p className="text-xs font-semibold text-[var(--app-accent)]">1. Học</p>
          <h3 className="mt-1.5 text-base font-bold text-[var(--app-foreground)]">{firstLesson?.title || 'Ôn kiến thức cơ bản'}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--app-muted)]">{firstLesson?.reason || 'Chưa đủ dữ liệu nên ôn lại bài cũ.'}</p>
        </div>

        {/* Exercises */}
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4">
          <p className="text-xs font-semibold text-[var(--app-accent)]">2. Làm bài tập</p>
          <ul className="mt-1.5 space-y-1 text-xs text-[var(--app-muted)]">
            {exercises.length > 0 ? (
              exercises.slice(0, 5).map((ex, i) => (
                <li key={ex.id || i}>• {ex.title}</li>
              ))
            ) : (
              <li>• 3 bài tập cơ bản tổng hợp</li>
            )}
          </ul>
        </div>

        {/* Opening */}
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4">
          <p className="text-xs font-semibold text-[var(--app-accent)]">3. Khai cuộc</p>
          <h3 className="mt-1.5 text-base font-bold text-[var(--app-foreground)]">{openings[0]?.title || 'Khai cuộc cơ bản'}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--app-muted)]">{openings[0]?.reason || 'Luyện 3-5 nước đầu để xây nền khai cuộc.'}</p>
        </div>

        {/* Challenge */}
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4">
          <p className="text-xs font-semibold text-[var(--app-accent)]">4. Chơi</p>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--app-muted)]">{firstChallenge?.reason || 'Chơi 1 ván và review lại.'}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <AppButton variant="primary" onClick={onStartLesson}>
          Bắt đầu bài học đề xuất
        </AppButton>
        <AppButton variant="secondary" onClick={onStartExercises}>
          Làm bài tập đề xuất
        </AppButton>
        {openings.length > 0 && (
          <AppButton variant="secondary" onClick={onStartOpening}>
            Lò luyện khai cuộc
          </AppButton>
        )}
      </div>
    </article>
  );
}
