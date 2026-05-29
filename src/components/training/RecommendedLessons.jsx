export default function RecommendedLessons({ lessons }) {
  return <article className="rounded-xl border border-slate-800 bg-slate-800 p-6 ">
    <h2 className="text-2xl font-bold">Bài học đề xuất</h2>
    <div className="mt-4 space-y-3">
      {lessons?.length ? lessons.map((lesson) => <div key={lesson.id || lesson.title} className="rounded-xl bg-slate-900 p-4">
        <h3 className="font-extrabold text-emerald-500">{lesson.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-400">{lesson.reason}</p>
      </div>) : <p className="text-slate-400">Chưa có đề xuất bài học. Hãy làm thêm bài tập hoặc chơi một ván.</p>}
    </div>
  </article>;
}
