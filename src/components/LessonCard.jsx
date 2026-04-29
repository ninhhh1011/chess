export default function LessonCard({ lesson, onClick }) {
  return <button onClick={onClick} className="group rounded-3xl border border-white/10 bg-white/[.07] p-5 text-left shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:border-gold/60 hover:bg-white/[.11]">
    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cream/10 text-2xl transition group-hover:bg-gold group-hover:text-ink">♟</div>
    <h3 className="text-lg font-extrabold text-cream">{lesson.title}</h3>
    <p className="mt-2 line-clamp-2 text-sm leading-6 text-cream/65">{lesson.content}</p>
  </button>;
}
