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
    <article className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-white/[.07] to-white/[.04] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-500/80">Lộ trình hôm nay</p>
          <h2 className="mt-2 text-3xl font-bold">Hôm nay bạn nên luyện</h2>
        </div>
        <button className="btn-secondary" onClick={onRegenerate}>Tạo lại lộ trình hôm nay</button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {/* Lesson */}
        <div className="rounded-xl bg-slate-900 p-5">
          <p className="font-bold text-emerald-500">1. Học</p>
          <h3 className="mt-2 text-xl font-extrabold">{firstLesson?.title || 'Ôn kiến thức cơ bản'}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{firstLesson?.reason || 'Chưa đủ dữ liệu nên ôn lại bài cũ.'}</p>
        </div>

        {/* Exercises */}
        <div className="rounded-xl bg-slate-900 p-5">
          <p className="font-bold text-emerald-500">2. Làm bài tập</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
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
        <div className="rounded-xl bg-slate-900 p-5">
          <p className="font-bold text-emerald-500">3. Khai cuộc</p>
          <h3 className="mt-2 text-xl font-extrabold">{openings[0]?.title || 'Khai cuộc cơ bản'}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{openings[0]?.reason || 'Luyện 3-5 nước đầu để xây nền khai cuộc.'}</p>
        </div>

        {/* Challenge */}
        <div className="rounded-xl bg-slate-900 p-5">
          <p className="font-bold text-emerald-500">4. Chơi</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{firstChallenge?.reason || 'Chơi 1 ván và review lại.'}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-primary" onClick={onStartLesson}>Bắt đầu bài học đề xuất</button>
        <button className="btn-secondary" onClick={onStartExercises}>Làm bài tập đề xuất</button>
        {openings.length > 0 && (
          <button className="btn-secondary" onClick={onStartOpening}>Lò luyện khai cuộc</button>
        )}
      </div>
    </article>
  );
}
