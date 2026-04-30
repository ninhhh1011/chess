export default function OpeningMoveList({ moves, currentIndex }) {
  return <div className="max-h-72 overflow-auto rounded-2xl bg-ink/45 p-3">
    {moves.map((move, index) => <div key={`${move.san}-${index}`} className={`mb-2 rounded-xl px-3 py-2 text-sm ${index === currentIndex ? 'bg-gold text-ink' : 'bg-white/5 text-cream/75'}`}>
      <b>{index + 1}. {move.san}</b>
      <p className="mt-1 opacity-80">{move.explanation}</p>
    </div>)}
  </div>;
}
