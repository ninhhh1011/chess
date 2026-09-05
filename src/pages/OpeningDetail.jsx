import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import OpeningCoachPanel from '../components/openings/OpeningCoachPanel';
import OpeningMoveList from '../components/openings/OpeningMoveList';
import OpeningProgress from '../components/openings/OpeningProgress';
import OpeningTrainerBoard from '../components/openings/OpeningTrainerBoard';
import { getOpeningById } from '../data/openings';
import { getOpeningProgressById } from '../services/openingProgressService';
import { playMoveSound } from '../utils/sound';
import { AppButton } from '../ui';

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

function buildFen(opening, currentIndex){
  const game = new Chess();
  let error = null;
  for(let i=0;i<=currentIndex;i++){
    const move = opening.moves[i];
    if(!move) break;
    try{ game.move(move.san); }catch(e){ error = `Nước ${move.san} không hợp lệ trong dữ liệu.`; break; }
  }
  return { fen: game.fen(), error, game };
}

export default function OpeningDetail(){
  const { openingId } = useParams();
  const opening = getOpeningById(openingId);
  const [mode,setMode] = useState('learn');
  const [currentIndex,setCurrentIndex] = useState(-1);
  const [progress,setProgress] = useState(() => getOpeningProgressById(openingId));
  const [moveHints,setMoveHints] = useState({});
  const [selectedSquare,setSelectedSquare] = useState(null);
  const boardState = useMemo(() => opening ? buildFen(opening,currentIndex) : {fen:'start',error:null,game:new Chess()}, [opening,currentIndex]);

  if(!opening) return (
    <section className="mx-auto max-w-4xl py-8">
      <h1 className="text-2xl font-bold text-[var(--app-foreground)]">Không tìm thấy khai cuộc</h1>
      <Link to="/openings" className="mt-4 inline-block">
        <AppButton variant="primary">Quay lại danh sách</AppButton>
      </Link>
    </section>
  );

  const currentMove = opening.moves[currentIndex];
  const boardOrientation = opening.side === 'black' ? 'black' : 'white';

  function clearHints(){ setMoveHints({}); setSelectedSquare(null); }
  function goToMove(nextIndex){ setCurrentIndex(nextIndex); clearHints(); if(nextIndex !== currentIndex) playMoveSound(); }
  function showLegalMoveHints(square){
    const piece = boardState.game.get(square);
    if(!piece || piece.color !== boardState.game.turn()) return;
    const styles = boardState.game.moves({ square, verbose:true }).reduce((next, move) => {
      next[move.to] = move.captured ? captureRingStyle : moveDotStyle;
      return next;
    }, {});
    setSelectedSquare(square);
    setMoveHints(styles);
  }
  function handleSquareClick({ square }){
    if(selectedSquare && moveHints[square]){ clearHints(); return; }
    showLegalMoveHints(square);
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-4">
        <Link to="/openings">
          <AppButton size="sm" variant="ghost">
            ← Danh sách khai cuộc
          </AppButton>
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--app-foreground)] md:text-4xl">{opening.name}</h1>
          <p className="mt-1 text-base font-semibold text-[var(--app-accent)]">{opening.vietnameseName}</p>
        </div>
        <div className="flex gap-2">
          <AppButton size="sm" variant={mode === 'learn' ? 'primary' : 'secondary'} onClick={() => setMode('learn')}>
            Learn Mode
          </AppButton>
          <AppButton size="sm" variant={mode === 'practice' ? 'primary' : 'secondary'} onClick={() => setMode('practice')}>
            Practice Mode
          </AppButton>
        </div>
      </div>

      {mode === 'learn' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,560px)_1fr]">
          <div className="mx-auto aspect-square w-[min(100%,560px)] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
            <Chessboard
              options={{
                position: boardState.fen,
                boardOrientation,
                allowDragging: false,
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
            <OpeningProgress progress={progress} />
            <p className="text-xs leading-relaxed text-[var(--app-muted)]">{opening.description}</p>
            {boardState.error && (
              <p className="rounded-md bg-[var(--app-danger)]/15 p-3 text-xs font-semibold text-[var(--app-danger)]">
                {boardState.error}
              </p>
            )}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--app-foreground)]">Ý tưởng chính</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-[var(--app-muted)]">
                {opening.mainIdeas.map(i => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 text-xs">
              <span className="font-semibold text-[var(--app-foreground)]">Giải thích nước hiện tại:</span>
              <p className="mt-1 text-[var(--app-muted)]">
                {currentMove ? `${currentMove.san}: ${currentMove.explanation}` : 'Bấm Bước tiếp theo để bắt đầu replay line.'}
              </p>
            </div>
            <OpeningMoveList moves={opening.moves} currentIndex={currentIndex} />
            <div className="flex flex-wrap gap-2">
              <AppButton size="sm" variant="secondary" onClick={() => goToMove(Math.max(-1, currentIndex - 1))}>
                Bước trước
              </AppButton>
              <AppButton size="sm" variant="primary" onClick={() => goToMove(Math.min(opening.moves.length - 1, currentIndex + 1))}>
                Bước tiếp theo
              </AppButton>
              <AppButton size="sm" variant="secondary" onClick={() => goToMove(-1)}>
                Về đầu
              </AppButton>
              <AppButton size="sm" variant="secondary" onClick={() => setMode('practice')}>
                Chuyển sang luyện tập
              </AppButton>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--app-foreground)]">Lỗi thường gặp</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-[var(--app-muted)]">
                {opening.commonMistakes.map(i => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </div>
            <OpeningCoachPanel opening={opening} />
          </aside>
        </div>
      ) : (
        <OpeningTrainerBoard opening={opening} onProgress={setProgress} />
      )}
    </section>
  );
}
