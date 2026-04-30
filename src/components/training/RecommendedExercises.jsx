export default function RecommendedExercises({ exercises }) {
  return <article className="rounded-[2rem] border border-white/10 bg-white/[.08] p-6 backdrop-blur">
    <h2 className="text-2xl font-black">Dạng bài tập đề xuất</h2>
    <div className="mt-4 space-y-3">
      {exercises?.length ? exercises.map((exercise) => <div key={exercise.id || exercise.tag} className="rounded-2xl bg-ink/45 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-extrabold text-gold">{exercise.title}</h3>
          {exercise.tag && <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-cream/60">{exercise.tag}</span>}
        </div>
        <p className="mt-1 text-sm leading-6 text-cream/65">{exercise.reason}</p>
      </div>) : <p className="text-cream/45">Chưa có đề xuất bài tập. Hãy hoàn thành vài bài đầu tiên.</p>}
    </div>
  </article>;
}
