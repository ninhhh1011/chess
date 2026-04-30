import MoveClassificationBadge from './MoveClassificationBadge';

export default function GameReviewPanel({ review, isReviewing, onReview }) {
  return <article className="mt-5 rounded-[2rem] border border-white/10 bg-white/[.08] p-5 backdrop-blur">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-black">Review ván bằng engine</h2>
      <button className="btn-secondary" onClick={onReview} disabled={isReviewing}>{isReviewing ? 'Đang review...' : 'Review ván bằng engine'}</button>
    </div>
    {!review ? <p className="mt-4 text-cream/55">Chơi vài nước rồi bấm review để xem good move, sai lầm và blunder.</p> : <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-2xl bg-ink/45 p-3"><b>{review.total}</b><p className="text-xs text-cream/55">Nước phân tích</p></div>
        <div className="rounded-2xl bg-ink/45 p-3"><b>{review.counts.good}</b><p className="text-xs text-cream/55">Good</p></div>
        <div className="rounded-2xl bg-ink/45 p-3"><b>{review.counts.inaccuracy}</b><p className="text-xs text-cream/55">Thiếu chính xác</p></div>
        <div className="rounded-2xl bg-ink/45 p-3"><b>{review.counts.mistake}</b><p className="text-xs text-cream/55">Sai lầm</p></div>
        <div className="rounded-2xl bg-ink/45 p-3"><b>{review.counts.blunder}</b><p className="text-xs text-cream/55">Blunder</p></div>
      </div>
      <div>
        <h3 className="font-black text-gold">3 lỗi lớn nhất</h3>
        <div className="mt-2 space-y-2">
          {review.worstMoves.length ? review.worstMoves.map((item) => <div key={item.index} className="rounded-2xl bg-ink/45 p-3 text-sm">
            <MoveClassificationBadge type={item.classification.type} label={item.classification.label} />
            <span className="ml-2 text-cream/70">Nước #{item.index + 1}: bạn đi {item.playedSan}, engine gợi ý {item.bestSan}</span>
          </div>) : <p className="text-cream/55">Chưa thấy lỗi lớn trong phần đã phân tích.</p>}
        </div>
      </div>
    </div>}
  </article>;
}
