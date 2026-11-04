import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { updateOpeningAttempt, updateOpeningProgressSM2 } from '../../services/openingProgressService';
import { playCaptureSound, playMoveSound } from '../../utils/sound';
import { AppButton, AppSurface } from '../../ui';

const moveDotStyle = {
  backgroundImage: 'radial-gradient(circle, rgba(16,24,20,0.38) 22%, transparent 24%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
};

const captureRingStyle = {
  backgroundImage: 'radial-gradient(circle, transparent 52%, rgba(16,24,20,0.54) 54%, rgba(16,24,20,0.54) 66%, transparent 68%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
};

function sideToColor(side){ return side === 'black' ? 'b' : 'w'; }
function userShouldMove(opening, index){
  if(opening.side === 'both') return true;
  return (index % 2 === 0 ? 'w' : 'b') === sideToColor(opening.side);
}
function sameSan(a,b){ return String(a || '').replace(/[+#]/g,'') === String(b || '').replace(/[+#]/g,''); }

export default function OpeningTrainerBoard({ opening, onProgress }) {
  const [game, setGame] = useState(() => new Chess());
  const [moveIndex, setMoveIndex] = useState(0);
  const [message, setMessage] = useState('Hãy đi đúng line khai cuộc.');
  const [mistakes, setMistakes] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showQualityRating, setShowQualityRating] = useState(false);
  const [moveHints, setMoveHints] = useState({});
  const [selectedSquare, setSelectedSquare] = useState(null);
  const boardOrientation = opening.side === 'black' ? 'black' : 'white';

  const expectedMove = opening.moves[moveIndex];
  const waitingForUser = expectedMove && userShouldMove(opening, moveIndex);

  function finishIfNeeded(nextIndex, nextMistakes = mistakes){
    if(nextIndex >= opening.moves.length){
      const success = nextMistakes.length === 0;
      updateOpeningAttempt({ openingId: opening.id, success, mistakes: nextMistakes, completedMoves: nextIndex });
      setIsFinished(true);
      setShowQualityRating(true);
      setMessage(success ? 'Hoàn thành line khai cuộc rất tốt! Vui lòng tự đánh giá mức độ ghi nhớ (SM-2).' : 'Đã hết line. Vui lòng tự đánh giá (SM-2).');
    }
  }

  function handleRateQuality(quality) {
    const progress = updateOpeningProgressSM2(opening.id, quality);
    onProgress?.(progress);
    setShowQualityRating(false);
    setMessage(`Đã lưu kết quả đánh giá (điểm ${quality}).`);
  }

  useEffect(() => {
    if(!expectedMove || waitingForUser || isFinished) return undefined;
    const timer = window.setTimeout(() => {
      const copy = new Chess(game.fen());
      try{
        copy.move(expectedMove.san);
        playMoveSound();
        setGame(copy);
        const nextIndex = moveIndex + 1;
        setMoveIndex(nextIndex);
        setMessage(`Coach đi ${expectedMove.san}: ${expectedMove.explanation}`);
        finishIfNeeded(nextIndex);
      }catch(error){
        setMessage(`Move trong dữ liệu không hợp lệ: ${expectedMove.san}`);
      }
    }, 550);
    return () => window.clearTimeout(timer);
  }, [expectedMove, waitingForUser, isFinished, game, moveIndex]);

  function onDrop({ sourceSquare, targetSquare }){
    if(!waitingForUser || !expectedMove || isFinished) return false;
    const copy = new Chess(game.fen());
    const move = copy.move({ from: sourceSquare, to: targetSquare, promotion:'q' });
    if(!move){
      setMessage('Nước đi không hợp lệ theo luật cờ.');
      return false;
    }
    if(sameSan(move.san, expectedMove.san)){
      if(move.captured) playCaptureSound(); else playMoveSound();
      setGame(copy);
      setMoveHints({});
      setSelectedSquare(null);
      const nextIndex = moveIndex + 1;
      setMoveIndex(nextIndex);
      setMessage(`Chính xác! ${expectedMove.explanation}`);
      finishIfNeeded(nextIndex);
      return true;
    }
    const mistake = { moveIndex, expected: expectedMove.san, actual: move.san, timestamp: new Date().toISOString() };
    setMistakes(current => [...current, mistake]);
    setMessage(`Chưa đúng, thử lại. Nước bạn đi: ${move.san}.`);
    return false;
  }

  function reset(){
    setGame(new Chess()); setMoveIndex(0); setMistakes([]); setIsFinished(false); setShowQualityRating(false); setMoveHints({}); setSelectedSquare(null); setMessage('Hãy đi đúng line khai cuộc.');
  }

  function showLegalMoveHints(square, force = false){
    const piece = game.get(square);
    if(!piece || piece.color !== game.turn() || isFinished) return;
    if(!force && !waitingForUser) return;
    const styles = game.moves({ square, verbose:true }).reduce((next, move) => {
      next[move.to] = move.captured ? captureRingStyle : moveDotStyle;
      return next;
    }, {});
    setSelectedSquare(square);
    setMoveHints(styles);
  }

  function handleSquareClick({ square }){
    if(selectedSquare && moveHints[square]){
      onDrop({ sourceSquare:selectedSquare, targetSquare:square });
      return;
    }
    showLegalMoveHints(square);
  }

  function showCorrect(){ setMessage(`Nước đúng là ${expectedMove?.san || 'hết line'}: ${expectedMove?.explanation || ''}`); }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(280px,560px)_1fr] items-start">
      <div className="mx-auto aspect-square w-[min(100%,560px)] p-3.5 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-card)]">
        <div className="overflow-hidden rounded-[18px] border border-[var(--app-border)]">
          <Chessboard
            options={{
              position: game.fen(),
              boardOrientation,
              onPieceDrop: onDrop,
              onPieceDrag: ({ square }) => showLegalMoveHints(square, true),
              onPieceClick: ({ square }) => showLegalMoveHints(square),
              onSquareClick: handleSquareClick,
              squareStyles: moveHints,
              showNotation: true,
              darkSquareStyle: { backgroundColor: '#587982' },
              lightSquareStyle: { backgroundColor: '#FBF9F5' },
            }}
          />
        </div>
      </div>
      <div className="space-y-5 p-7 sm:p-8 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-card)]">
        <h2 className="font-serif text-2xl font-bold text-[#030302]">Luyện tập nước đi</h2>
        <div className="rounded-[16px] border border-[var(--app-border)] bg-[var(--app-muted-surface)]/60 p-4 text-xs font-medium text-[#030302]">
          {message}
        </div>
        <p className="text-xs sm:text-sm text-[var(--app-muted)]">
          Nước cần luyện: <b className="text-[#030302] font-semibold">{waitingForUser ? expectedMove?.san : 'Coach đang đi...'}</b>
        </p>
        <div className="flex flex-wrap gap-2.5">
          <AppButton size="sm" variant="secondary" onClick={() => setMessage(expectedMove?.explanation || 'Đã hết line.')}>
            Ninh mách nước
          </AppButton>
          <AppButton size="sm" variant="secondary" onClick={showCorrect}>
            Hiện nước đúng
          </AppButton>
          <AppButton size="sm" variant="secondary" onClick={reset}>
            Làm lại
          </AppButton>
        </div>
        <p className="text-xs text-[var(--app-subtle)]">Lỗi sai phiên này: {mistakes.length}</p>

        {showQualityRating && (
          <div className="p-5 rounded-[20px] bg-[var(--app-muted-surface)]/60 border border-[var(--app-border)] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#030302]">
              Đánh giá mức độ ghi nhớ (SM-2)
            </h3>
            <div className="flex flex-col gap-1.5">
              <AppButton size="sm" variant="ghost" className="justify-start text-xs rounded-full hover:bg-white" onClick={() => handleRateQuality(5)}>
                5 - Hoàn hảo, nhớ ngay lập tức
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs rounded-full hover:bg-white" onClick={() => handleRateQuality(4)}>
                4 - Đúng, nhưng có chút ngập ngừng
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs rounded-full hover:bg-white" onClick={() => handleRateQuality(3)}>
                3 - Đúng, nhưng phải suy nghĩ lâu
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs rounded-full hover:bg-white" onClick={() => handleRateQuality(2)}>
                2 - Sai, nhưng khi thấy nước đúng thì nhớ ra ngay
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs rounded-full hover:bg-white" onClick={() => handleRateQuality(1)}>
                1 - Sai, và chỉ mang máng nhớ
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs rounded-full hover:bg-white" onClick={() => handleRateQuality(0)}>
                0 - Hoàn toàn không nhớ gì
              </AppButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
