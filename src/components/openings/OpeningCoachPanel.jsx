export default function OpeningCoachPanel({ opening }) {
  return <article className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm leading-7 text-slate-100/80">
    <h2 className="text-xl font-bold text-emerald-500">Coach ghi chú</h2>
    <p className="mt-3">Với {opening.vietnameseName}, đừng chỉ nhớ nước đi. Hãy nhớ ý tưởng: {opening.mainIdeas.slice(0,2).join(', ')}.</p>
    <p className="mt-2">Nếu đi sai, quay lại Learn Mode và đọc giải thích từng nước trước khi luyện lại.</p>
  </article>;
}
