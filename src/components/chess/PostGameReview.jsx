import { useNavigate } from 'react-router-dom';
import { useChessGame } from '../../contexts/ChessGameContext';
import { BRAND_NAMES, RESULT_COPY } from '../../config/brand';
import coachAvatar from '../../assets/avatarcoach.webp';

function getResultKind({ game, playerColor, resultNotice }) {
  if (game.isDraw() || resultNotice?.toLowerCase().includes('hòa')) return 'draw';
  if (resultNotice?.toLowerCase().includes('đầu hàng')) return 'lose';
  if (!game.isCheckmate()) return 'draw';

  const winner = game.turn() === 'w' ? 'b' : 'w';
  return winner === playerColor ? 'win' : 'lose';
}

export default function PostGameReview() {
  const navigate = useNavigate();
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

  // Coach advice based on game analysis
  const getCoachAdvice = () => {
    const goalAdvice = {
      fun: 'Chơi tiếp để cải thiện nhé.',
      opening: 'Tập trung vào phát triển quân và kiểm soát trung tâm.',
      noblunder: 'Hãy chú ý đến các quân đang bị tấn công trước mỗi nước đi.',
      checkmate: 'Tập phối hợp tấn công và xử lý chiếu hết.',
    };

    let advice = goalAdvice[gameGoal] || goalAdvice.fun;

    if (blunders > 0) {
      advice = `Có ${blunders} nước mắc sai lầm nghiêm trọng. Đây là điểm cần luyện tập trước.`;
    } else if (mistakes > 2) {
      advice = 'Một vài nước cần cải thiện. Hãy chậm lại và suy nghĩ kỹ hơn.';
    } else if (inaccuracies > 5) {
      advice = 'Còn nhiều chỗ cải thiện. Luyện thêm để có những nước chính xác hơn.';
    } else if (resultKind === 'win') {
      advice = 'Ván chơi tốt! Hãy tiếp tục phát huy và thử thách bản thân với cấp độ cao hơn.';
    }

    return advice;
  };

  // Practice recommendation based on weakness
  const getPracticeRecommendation = () => {
    if (blunders > 0) return { type: 'tactics', label: 'Bài tập chiến thuật', hint: 'Luyện tập các bài chiến thuật cơ bản' };
    if (mistakes > 2) return { type: 'endgame', label: 'Tàn cuộc', hint: 'Học cách kết thúc ván cờ hiệu quả' };
    if (inaccuracies > 3) return { type: 'opening', label: 'Khai cuộc', hint: 'Ôn lại các nguyên tắc khai cuộc' };
    return { type: 'general', label: 'Luyện tập', hint: 'Chơi thêm để cải thiện' };
  };

  const coachAdvice = getCoachAdvice();
  const recommendation = getPracticeRecommendation();

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-950/80 p-4">
      <div className="ui-card w-full max-w-lg space-y-6 p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-100 md:text-3xl">{resultCopy.title}</h2>
          <p className="mt-2 text-base font-medium text-primary-400">{resultCopy.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-bg-950 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-text-500">Tổng nước đi</div>
            <div className="mt-1 text-2xl font-bold text-text-200">{moveHistory.length}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col justify-center rounded-lg bg-bg-950 p-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Xuất sắc</div>
              <div className="font-bold text-cyan-300">{brilliant}</div>
            </div>
            <div className="flex flex-col justify-center rounded-lg bg-bg-950 p-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary-400">Tốt</div>
              <div className="font-bold text-primary-300">{great + bestMoves}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between rounded-lg bg-bg-950 p-4">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-text-500">Bình thường</div>
            <div className="mt-1 font-bold text-text-300">{good}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-text-500">Thiếu lực</div>
            <div className="mt-1 font-bold text-yellow-500">{inaccuracies}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-text-500">Sai lầm</div>
            <div className="mt-1 font-bold text-orange-500">{mistakes}</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-text-500">Nghiêm trọng</div>
            <div className="mt-1 font-bold text-red-500">{blunders}</div>
          </div>
        </div>

        {largestLoss > 0 && (
          <div className="rounded-lg bg-bg-950 p-4 text-center text-sm">
            <span className="text-text-400">Nước sai nghiêm trọng nhất: </span>
            <span className="font-bold text-rose-400">{suggestedBestSan || 'chưa có'}</span>
          </div>
        )}

        {/* Coach advice */}
        <div className="rounded-lg border border-primary-500/20 bg-primary-500/10 p-5 transition-all duration-200">
          <div className="mb-2 flex items-center gap-2">
            <img src={coachAvatar} alt="Coach" className="h-6 w-6 rounded-full" />
            <h3 className="font-bold text-primary-400">{BRAND_NAMES.coach}</h3>
          </div>
          <p className="text-sm leading-relaxed text-primary-100/90">{coachAdvice}</p>
        </div>

        {/* Practice recommendation */}
        <div className="rounded-lg border border-border/70 bg-bg-900/50 p-4 transition-all duration-200">
          <div className="text-xs font-medium text-text-400 mb-2">Gợi ý luyện tập tiếp theo</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-text-200">{recommendation.label}</div>
              <div className="text-xs text-text-500">{recommendation.hint}</div>
            </div>
            <button
              onClick={() => {
                const routes = {
                  tactics: '/exercises',
                  endgame: '/exercises',
                  opening: '/openings',
                  general: '/exercises',
                };
                navigate(routes[recommendation.type] || '/exercises');
              }}
              className="rounded-md border border-primary-500/30 px-3 py-1.5 text-xs font-medium text-primary-400 hover:bg-primary-500/10 transition-colors"
            >
              Luyện ngay
            </button>
          </div>
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
              Đổi cấp độ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
