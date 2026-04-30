export default function RecommendedLessons({ lessons }) {
  return <article className="rounded-[2rem] border border-white/10 bg-white/[.08] p-6 backdrop-blur">
    <h2 className="text-2xl font-black">Bài học đề xuất</h2>
    <div className="mt-4 space-y-3">
      {lessons?.length ? lessons.map((lesson) => <div key={lesson.id || lesson.title} className="rounded-2xl bg-ink/45 p-4">
        <h3 className="font-extrabold text-gold">{lesson.title}</h3>
        <p className="mt-1 text-sm leading-6 text-cream/65">{lesson.reason}</p>
      </div>) : <p className="text-cream/45">Chưa có đề xuất bài học. Hãy làm thêm bài tập hoặc chơi một ván.</p>}
    </div>
  </article>;
}
