import { useChessGame } from '../../contexts/ChessGameContext';

export default function PostGameReview() {
  const { 
    resultNotice, 
    moveHistory, 
    moveAnnotations, 
    setPlayState, 
    newGame,
    gameGoal,
    enterAnalysisMode,
    restartGameWithCurrentSettings
  } = useChessGame();

  const handlePlayAgain = () => {
    restartGameWithCurrentSettings();
  };

  const handleReviewBoard = () => {
    enterAnalysisMode();
    setPlayState('analysis');
  };

  // Calculate stats
  let brilliant = 0;
  let great = 0;
  let bestMoves = 0;
  let good = 0;
  let inaccuracies = 0;
  let mistakes = 0;
  let blunders = 0;
  let suggestedBestSan = null;
  let largestLoss = 0;

  Object.values(moveAnnotations).forEach(annotation => {
    if (annotation.tone === 'blunder') {
      blunders++;
      if (annotation.loss > largestLoss) {
        largestLoss = annotation.loss;
        suggestedBestSan = annotation.bestSan;
      }
    }
    if (annotation.tone === 'mistake') mistakes++;
    if (annotation.tone === 'inaccuracy') inaccuracies++;
    if (annotation.tone === 'good') good++;
    if (annotation.tone === 'best') bestMoves++;
    if (annotation.tone === 'great') great++;
    if (annotation.tone === 'brilliant') brilliant++;
  });

  const goalAdvice = {
    fun: 'Ván này mục tiêu là chơi thoải mái. Hãy giữ nhịp chơi ổn định và chú ý các quân đang bị tấn công.',
    opening: 'Mục tiêu là tập khai cuộc. Hãy ưu tiên phát triển quân nhẹ, kiểm soát trung tâm và nhập thành sớm.',
    noblunder: 'Mục tiêu là hạn chế blunder. Trước mỗi nước đi, hãy kiểm tra quân nào đang bị tấn công và đối thủ có nước bắt quân miễn phí không.',
    checkmate: 'Mục tiêu là luyện chiếu hết. Hãy chú ý các đường tấn công vào vua và phối hợp hậu, xe, tượng, mã.'
  };

  let ninhAdvice = goalAdvice[gameGoal] || goalAdvice.fun;

  if (blunders > 0) {
    if (gameGoal === 'noblunder') {
      ninhAdvice = 'Mục tiêu của ván này là hạn chế blunder, nhưng bạn vẫn có nước mất lợi thế lớn. Ván sau hãy dừng 5 giây trước mỗi nước để kiểm tra quân đang bị treo.';
    } else {
      ninhAdvice = 'Bạn đã mắc sai lầm nghiêm trọng (blunder). Ở ván sau, hãy luôn kiểm tra xem quân của bạn có đang bị đe dọa không trước khi đi nhé.';
    }
  } else if (mistakes > 2) {
    ninhAdvice = 'Thế trận khá tốt nhưng còn một vài nước đi lỗi nhịp. Cố gắng kiểm soát trung tâm chặt hơn.';
  } else if (resultNotice?.includes('hòa')) {
    ninhAdvice = 'Bạn giữ thế ổn, nhưng cần cải thiện kỹ năng chuyển hóa lợi thế để giành chiến thắng.';
  } else if (resultNotice?.includes('thắng')) {
    ninhAdvice = 'Chiến thuật tuyệt vời! Bạn tận dụng lỗi của đối thủ rất tốt. Ván sau thử sức ở cấp độ khó hơn nhé.';
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
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
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-950 p-2 text-center flex flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Thiên tài</div>
              <div className="font-bold text-cyan-300">{brilliant}</div>
            </div>
            <div className="rounded-lg bg-slate-950 p-2 text-center flex flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Tuyệt/Tốt</div>
              <div className="font-bold text-emerald-300">{great + bestMoves}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between rounded-lg bg-slate-950 p-4">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Bình thường</div>
            <div className="mt-1 font-bold text-slate-300">{good}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Lệch</div>
            <div className="mt-1 font-bold text-yellow-500">{inaccuracies}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Sai lầm</div>
            <div className="mt-1 font-bold text-orange-500">{mistakes}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Blunder</div>
            <div className="mt-1 font-bold text-red-500">{blunders}</div>
          </div>
        </div>

        {largestLoss > 0 && (
          <div className="rounded-lg bg-slate-950 p-4 text-center text-sm">
            <span className="text-slate-400">Lỗi lớn nhất: </span>
            <span className="font-bold text-rose-400">Chưa đủ dữ liệu để xác định</span>
            <br />
            <span className="text-slate-400">Nước engine gợi ý: </span>
            <span className="font-bold text-emerald-400">{suggestedBestSan || 'Chưa có'}</span>
          </div>
        )}

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-slate-900">N</span>
            <h3 className="font-bold text-emerald-400">Bài học từ Ninh</h3>
          </div>
          <p className="text-sm leading-relaxed text-emerald-100/90">{ninhAdvice}</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button 
            onClick={handleReviewBoard}
            className="ui-button-primary w-full py-3"
          >
            Xem lại từng nước
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handlePlayAgain}
              className="ui-button-secondary w-full py-2"
            >
              Chơi lại
            </button>
            <button 
              onClick={() => {
                newGame();
                setPlayState('lobby');
              }}
              className="ui-button-secondary w-full py-2"
            >
              Đổi thiết lập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
