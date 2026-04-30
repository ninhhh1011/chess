import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { updateOpeningAttempt } from '../../services/openingProgressService';
import { playCaptureSound, playMoveSound } from '../../utils/sound';

const moveDotStyle = {
  backgroundImage: 'radial-gradient(circle, rgba(23,18,13,0.34) 18%, transparent 20%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
};

const captureRingStyle = {
  backgroundImage: 'radial-gradient(circle, transparent 52%, rgba(23,18,13,0.34) 54%, rgba(23,18,13,0.34) 66%, transparent 68%)',
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
  const [moveHints, setMoveHints] = useState({});
  const [selectedSquare, setSelectedSquare] = useState(null);
  const boardOrientation = opening.side === 'black' ? 'black' : 'white';

  const expectedMove = opening.moves[moveIndex];
  const waitingForUser = expectedMove && userShouldMove(opening, moveIndex);

  function finishIfNeeded(nextIndex, nextMistakes = mistakes){
    if(nextIndex >= opening.moves.length){
      const success = nextMistakes.length === 0;
      const progress = updateOpeningAttempt({ openingId: opening.id, success, mistakes: nextMistakes, completedMoves: nextIndex });
      onProgress?.(progress);
      setIsFinished(true);
      setMessage(success ? 'Hoàn thành line khai cuộc rất tốt!' : 'Đã hết line. Hãy luyện lại để giảm lỗi sai.');
    }
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
    setGame(new Chess()); setMoveIndex(0); setMistakes([]); setIsFinished(false); setMoveHints({}); setSelectedSquare(null); setMessage('Hãy đi đúng line khai cuộc.');
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

  return <div className="grid gap-6 lg:grid-cols-[minmax(280px,560px)_1fr]">
    <div className="mx-auto aspect-square w-[min(100%,560px)] rounded-[2rem] border border-white/10 bg-white/[.08] p-3 shadow-glow backdrop-blur">
      <Chessboard options={{ position: game.fen(), boardOrientation, onPieceDrop:onDrop, onPieceDrag:({ square })=>showLegalMoveHints(square, true), onPieceClick:({ square })=>showLegalMoveHints(square), onSquareClick:handleSquareClick, squareStyles:moveHints, showNotation:true, boardStyle:{ borderRadius:'1.25rem', overflow:'hidden' }, darkSquareStyle:{backgroundColor:'#7a4f2d'}, lightSquareStyle:{backgroundColor:'#f7e4bf'} }} />
    </div>
    <aside className="rounded-[2rem] border border-white/10 bg-white/[.08] p-6 backdrop-blur">
      <h2 className="text-2xl font-black">Practice Mode</h2>
      <p className="mt-3 rounded-2xl bg-ink/45 p-4 font-bold text-gold">{message}</p>
      <p className="mt-4 text-cream/65">Nước cần luyện: <b>{waitingForUser ? expectedMove?.san : 'Coach đang đi...'}</b></p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-secondary" onClick={() => setMessage(expectedMove?.explanation || 'Đã hết line.')}>Gợi ý</button>
        <button className="btn-secondary" onClick={showCorrect}>Hiện nước đúng</button>
        <button className="btn-secondary" onClick={reset}>Làm lại</button>
      </div>
      <p className="mt-5 text-sm text-cream/55">Lỗi sai phiên này: {mistakes.length}</p>
    </aside>
  </div>;
}
