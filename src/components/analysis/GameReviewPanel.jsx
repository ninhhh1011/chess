import MoveClassificationBadge from './MoveClassificationBadge';

export default function GameReviewPanel({ review, isReviewing, onReview }) {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/75">Review</p>
          <h2 className="mt-1 text-lg font-bold text-slate-50">Engine scan</h2>
        </div>
        <button className="btn-secondary min-h-10 px-3 py-2 text-sm" onClick={onReview} disabled={isReviewing}>
          {isReviewing ? 'Đang review...' : 'Review ván'}
        </button>
      </div>

      {!review ? (
        <p className="mt-3 text-sm leading-6 text-slate-400">Chơi vài nước rồi bấm review để xem good move, sai lầm và blunder.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"><b>{review.total}</b><p className="text-xs text-slate-400">Nước</p></div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"><b>{review.counts.good}</b><p className="text-xs text-slate-400">Good</p></div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"><b>{review.counts.inaccuracy}</b><p className="text-xs text-slate-400">Thiếu chính xác</p></div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"><b>{review.counts.blunder}</b><p className="text-xs text-slate-400">Blunder</p></div>
          </div>
          <div>
            <h3 className="font-bold text-emerald-300">Lỗi lớn nhất</h3>
            <div className="mt-2 space-y-2">
              {review.worstMoves.length ? review.worstMoves.map((item) => (
                <div key={item.index} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm">
                  <MoveClassificationBadge type={item.classification.type} label={item.classification.label} />
                  <span className="ml-2 text-slate-300">#{item.index + 1}: {item.playedSan}, engine gợi ý {item.bestSan}</span>
                </div>
              )) : <p className="text-sm text-slate-400">Chưa thấy lỗi lớn trong phần đã phân tích.</p>}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
