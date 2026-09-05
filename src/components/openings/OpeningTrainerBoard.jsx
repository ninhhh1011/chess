import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { updateOpeningAttempt, updateOpeningProgressSM2 } from '../../services/openingProgressService';
import { playCaptureSound, playMoveSound } from '../../utils/sound';
import { AppButton } from '../../ui';

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
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,560px)_1fr]">
      <div className="mx-auto aspect-square w-[min(100%,560px)] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
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
            boardStyle: { borderRadius: '8px', overflow: 'hidden' },
            darkSquareStyle: { backgroundColor: '#66745C' },
            lightSquareStyle: { backgroundColor: '#DAD2BD' },
          }}
        />
      </div>
      <aside className="space-y-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
        <h2 className="text-xl font-bold text-[var(--app-foreground)]">Practice Mode</h2>
        <div className="rounded-md border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-xs font-medium text-[var(--app-accent-hover)]">
          {message}
        </div>
        <p className="text-xs text-[var(--app-muted)]">
          Nước cần luyện: <b className="text-[var(--app-foreground)]">{waitingForUser ? expectedMove?.san : 'Coach đang đi...'}</b>
        </p>
        <div className="flex flex-wrap gap-2">
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
          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--app-foreground)]">
              Đánh giá mức độ ghi nhớ (SM-2)
            </h3>
            <div className="flex flex-col gap-1.5">
              <AppButton size="sm" variant="ghost" className="justify-start text-xs" onClick={() => handleRateQuality(5)}>
                5 - Hoàn hảo, nhớ ngay lập tức
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs" onClick={() => handleRateQuality(4)}>
                4 - Đúng, nhưng có chút ngập ngừng
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs" onClick={() => handleRateQuality(3)}>
                3 - Đúng, nhưng phải suy nghĩ lâu
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs" onClick={() => handleRateQuality(2)}>
                2 - Sai, nhưng khi thấy nước đúng thì nhớ ra ngay
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs" onClick={() => handleRateQuality(1)}>
                1 - Sai, và chỉ mang máng nhớ
              </AppButton>
              <AppButton size="sm" variant="ghost" className="justify-start text-xs" onClick={() => handleRateQuality(0)}>
                0 - Hoàn toàn không nhớ gì
              </AppButton>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
