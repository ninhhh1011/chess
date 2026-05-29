export default function LessonCard({ lesson, onClick }) {
  return <button onClick={onClick} className="group rounded-xl border border-slate-800 bg-slate-800 p-5 text-left shadow-sm  transition hover:border-slate-600 hover:bg-slate-800/80 hover:border-emerald-500/60 hover:bg-slate-800">
    <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-slate-800 text-2xl transition group-hover:bg-emerald-500 group-hover:text-slate-950">♟</div>
    <h3 className="text-lg font-extrabold text-slate-100">{lesson.title}</h3>
    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{lesson.content}</p>
  </button>;
}
