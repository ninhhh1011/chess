import { useChessGame } from '../../contexts/ChessGameContext';

export default function PostGameReview() {
  const { 
    resultNotice, 
    moveHistory, 
    moveAnnotations, 
    setPlayState, 
    newGame 
  } = useChessGame();

  const handlePlayAgain = () => {
    newGame();
    setPlayState('lobby');
  };

  const handleReviewBoard = () => {
    setPlayState('playing'); // We just let them view the board in 'playing' state even though it's over
  };

  // Calculate stats
  let blunders = 0;
  let mistakes = 0;
  let inaccuracies = 0;
  let bestMoves = 0;
  let worstMoveSan = null;
  let worstMoveLoss = 0;

  Object.values(moveAnnotations).forEach(annotation => {
    if (annotation.tone === 'blunder') {
      blunders++;
      if (annotation.loss > worstMoveLoss) {
        worstMoveLoss = annotation.loss;
        worstMoveSan = annotation.bestSan; // Actually bestSan is what they should have played, the move played is in history
      }
    }
    if (annotation.tone === 'mistake') mistakes++;
    if (annotation.tone === 'inaccuracy') inaccuracies++;
    if (annotation.tone === 'best' || annotation.tone === 'brilliant') bestMoves++;
  });

  // Simple Ninh Coach logic
  let ninhAdvice = "Bạn chơi rất cẩn thận, hãy phát huy ở ván tiếp theo!";
  if (blunders > 0) {
    ninhAdvice = "Bạn đã mắc sai lầm nghiêm trọng (blunder). Ở ván sau, hãy luôn kiểm tra xem quân của bạn có đang bị đe dọa không trước khi đi nhé.";
  } else if (mistakes > 2) {
    ninhAdvice = "Thế trận khá tốt nhưng còn một vài nước đi lỗi nhịp. Cố gắng kiểm soát trung tâm chặt hơn.";
  } else if (resultNotice?.includes('hòa')) {
    ninhAdvice = "Bạn giữ thế ổn, nhưng cần cải thiện kỹ năng chuyển hóa lợi thế để giành chiến thắng.";
  } else if (resultNotice?.includes('thắng')) {
    ninhAdvice = "Chiến thuật tuyệt vời! Bạn tận dụng lỗi của đối thủ rất tốt. Ván sau thử sức ở cấp độ khó hơn nhé.";
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="ui-card w-full max-w-lg space-y-6 p-8 shadow-2xl">
        
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Ván cờ kết thúc</h2>
          <p className="mt-2 text-xl font-medium text-emerald-500">{resultNotice || "Đã kết thúc"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-950 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng số nước</div>
            <div className="mt-1 text-2xl font-bold text-slate-200">{moveHistory.length}</div>
          </div>
          <div className="rounded-lg bg-slate-950 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Nước xuất sắc</div>
            <div className="mt-1 text-2xl font-bold text-emerald-500">{bestMoves}</div>
          </div>
        </div>

        <div className="flex justify-between rounded-lg bg-slate-950 p-4">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Không chính xác</div>
            <div className="mt-1 font-bold text-slate-300">{inaccuracies}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Sai lầm</div>
            <div className="mt-1 font-bold text-amber-500">{mistakes}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Blunder</div>
            <div className="mt-1 font-bold text-rose-500">{blunders}</div>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-slate-900">N</span>
            <h3 className="font-bold text-emerald-400">Bài học từ Ninh</h3>
          </div>
          <p className="text-sm leading-relaxed text-emerald-100/90">{ninhAdvice}</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button 
            onClick={handlePlayAgain}
            className="ui-button-primary w-full py-3"
          >
            Chơi ván mới
          </button>
          <button 
            onClick={handleReviewBoard}
            className="ui-button-secondary w-full py-3"
          >
            Xem lại bàn cờ
          </button>
        </div>
      </div>
    </div>
  );
}
