export default function OpeningMoveList({ moves, currentIndex }) {
  return <div className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-3">
    {moves.map((move, index) => <div key={`${move.san}-${index}`} className={`mb-2 rounded-xl px-3 py-2 text-sm ${index === currentIndex ? 'bg-emerald-500 text-ink' : 'bg-slate-800 text-slate-300'}`}>
      <b>{index + 1}. {move.san}</b>
      <p className="mt-1 opacity-80">{move.explanation}</p>
    </div>)}
  </div>;
}
