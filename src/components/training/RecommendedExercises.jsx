export default function RecommendedExercises({ exercises }) {
  return <article className="rounded-xl border border-slate-800 bg-slate-800 p-6 ">
    <h2 className="text-2xl font-bold">Dạng bài tập đề xuất</h2>
    <div className="mt-4 space-y-3">
      {exercises?.length ? exercises.map((exercise) => <div key={exercise.id || exercise.tag} className="rounded-xl bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-extrabold text-emerald-500">{exercise.title}</h3>
          {exercise.tag && <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-slate-100/60">{exercise.tag}</span>}
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-400">{exercise.reason}</p>
      </div>) : <p className="text-slate-400">Chưa có đề xuất bài tập. Hãy hoàn thành vài bài đầu tiên.</p>}
    </div>
  </article>;
}
