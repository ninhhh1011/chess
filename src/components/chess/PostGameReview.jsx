import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES, RESULT_COPY } from '../../config/brand';

function getResultKind({ game, playerColor, resultNotice }) {
  if (game.isDraw() || resultNotice?.toLowerCase().includes('hòa')) return 'draw';
  if (resultNotice?.toLowerCase().includes('đầu hàng')) return 'lose';
  if (!game.isCheckmate()) return 'draw';

  const winner = game.turn() === 'w' ? 'b' : 'w';
  return winner === playerColor ? 'win' : 'lose';
}

export default function PostGameReview() {
  const {
    game,
    playerColor,
    resultNotice,
    moveHistory,
    moveAnnotations,
    setPlayState,
    newGame,
    gameGoal,
    enterAnalysisMode,
    restartGameWithCurrentSettings,
  } = useChessGame();

  const resultKind = getResultKind({ game, playerColor, resultNotice });
  const resultCopy = RESULT_COPY[resultKind];

  const handlePlayAgain = () => {
    restartGameWithCurrentSettings();
  };

  const handleReviewBoard = () => {
    enterAnalysisMode();
    setPlayState('analysis');
  };

  let brilliant = 0;
  let great = 0;
  let bestMoves = 0;
  let good = 0;
  let inaccuracies = 0;
  let mistakes = 0;
  let blunders = 0;
  let suggestedBestSan = null;
  let largestLoss = 0;

  Object.values(moveAnnotations).forEach((annotation) => {
    if (annotation.tone === 'blunder') {
      blunders += 1;
      if (annotation.loss > largestLoss) {
        largestLoss = annotation.loss;
        suggestedBestSan = annotation.bestSan;
      }
    }
    if (annotation.tone === 'mistake') mistakes += 1;
    if (annotation.tone === 'inaccuracy') inaccuracies += 1;
    if (annotation.tone === 'good') good += 1;
    if (annotation.tone === 'best') bestMoves += 1;
    if (annotation.tone === 'great') great += 1;
    if (annotation.tone === 'brilliant') brilliant += 1;
  });

  const goalAdvice = {
    fun: 'Ván này cứ giữ nhịp chắc trước. Ninh khuyên kiểm tra quân treo trước khi gáy.',
    opening: 'Mục tiêu là khai cuộc: phát triển quân nhẹ, giữ trung tâm, nhập thành sớm.',
    noblunder: 'Mục tiêu là hạn chế tự hủy: trước mỗi nước, nhìn lại quân nào đang bị tấn công.',
    checkmate: 'Mục tiêu là chiếu hết: phối hợp quân tấn công vua thay vì đi một mình.',
  };

  let ninhAdvice = goalAdvice[gameGoal] || goalAdvice.fun;

  if (blunders > 0) {
    ninhAdvice = 'Có pha mất quá nhiều mà không có bù đắp. Mổ lại đoạn đó trước khi phục thù.';
  } else if (mistakes > 2) {
    ninhAdvice = 'Thế trận có ý tưởng, nhưng vài nước hơi thiếu lực. Chậm lại một nhịp là ổn hơn.';
  } else if (resultKind === 'win') {
    ninhAdvice = 'Ninh duyệt ván này. Bạn tận dụng cơ hội tốt, nhưng gáy vừa đủ thôi.';
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="ui-card w-full max-w-lg space-y-6 p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">{resultCopy.title}</h2>
          <p className="mt-2 text-base font-medium text-emerald-400">{resultCopy.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-950 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng số nước</div>
            <div className="mt-1 text-2xl font-bold text-slate-200">{moveHistory.length}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col justify-center rounded-lg bg-slate-950 p-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Sáng nước</div>
              <div className="font-bold text-cyan-300">{brilliant}</div>
            </div>
            <div className="flex flex-col justify-center rounded-lg bg-slate-950 p-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Ổn</div>
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
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Thiếu lực</div>
            <div className="mt-1 font-bold text-yellow-500">{inaccuracies}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Tự hủy</div>
            <div className="mt-1 font-bold text-orange-500">{mistakes}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Blunder</div>
            <div className="mt-1 font-bold text-red-500">{blunders}</div>
          </div>
        </div>

        {largestLoss > 0 && (
          <div className="rounded-lg bg-slate-950 p-4 text-center text-sm">
            <span className="text-slate-400">Pha đau nhất: </span>
            <span className="font-bold text-rose-400">cần mổ lại</span>
            <br />
            <span className="text-slate-400">Ninh mách: </span>
            <span className="font-bold text-emerald-400">{suggestedBestSan || 'chưa có'}</span>
          </div>
        )}

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-slate-900">N</span>
            <h3 className="font-bold text-emerald-400">Ghi chú từ {BRAND_NAMES.coach}</h3>
          </div>
          <p className="text-sm leading-relaxed text-emerald-100/90">{ninhAdvice}</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button onClick={handlePlayAgain} className="ui-button-primary w-full py-3">
            {resultCopy.primary}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleReviewBoard} className="ui-button-secondary w-full py-2">
              {resultCopy.secondary}
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
