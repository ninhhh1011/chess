function TagList({ title, items, emptyText, tone = 'emerald-500' }) {
  const color = tone === 'weak' ? 'border-rose-300/25 bg-rose-400/10 text-rose-100' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500';
  return <article className="rounded-xl border border-slate-800 bg-slate-800 p-6 ">
    <h2 className="text-2xl font-bold">{title}</h2>
    <div className="mt-4 flex flex-wrap gap-2">
      {items?.length ? items.map((item) => <span key={item} className={`rounded-full border px-3 py-1 text-sm font-bold ${color}`}>{item}</span>) : <p className="text-slate-400">{emptyText}</p>}
    </div>
  </article>;
}

export default function StrengthWeaknessPanel({ strengths, weaknesses, mistakes }) {
  const combinedWeaknesses = [...new Set([...(weaknesses || []), ...(mistakes || [])])];

  return <div className="grid gap-5 lg:grid-cols-2">
    <TagList title="Điểm mạnh" items={strengths} emptyText="Hãy hoàn thành thêm bài tập để app xác định điểm mạnh." />
    <TagList title="Điểm yếu & lỗi thường gặp" items={combinedWeaknesses} emptyText="Chưa đủ dữ liệu để xác định điểm yếu." tone="weak" />
  </div>;
}
