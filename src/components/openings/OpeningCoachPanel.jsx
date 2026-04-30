export default function OpeningCoachPanel({ opening }) {
  return <article className="rounded-[2rem] border border-gold/20 bg-gold/10 p-5 text-sm leading-7 text-cream/80">
    <h2 className="text-xl font-black text-gold">Coach ghi chú</h2>
    <p className="mt-3">Với {opening.vietnameseName}, đừng chỉ nhớ nước đi. Hãy nhớ ý tưởng: {opening.mainIdeas.slice(0,2).join(', ')}.</p>
    <p className="mt-2">Nếu đi sai, quay lại Learn Mode và đọc giải thích từng nước trước khi luyện lại.</p>
  </article>;
}
