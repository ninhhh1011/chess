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

  if(!opening) return <section><h1 className="text-4xl font-black">Không tìm thấy khai cuộc</h1><Link className="btn-primary mt-6" to="/openings">Quay lại danh sách</Link></section>;
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

  return <section>
    <Link to="/openings" className="btn-secondary mb-6">← Danh sách khai cuộc</Link>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-4xl font-black md:text-5xl">{opening.name}</h1><p className="mt-2 text-xl font-bold text-gold">{opening.vietnameseName}</p></div>
      <div className="flex gap-2"><button className={mode==='learn'?'btn-primary':'btn-secondary'} onClick={()=>setMode('learn')}>Learn Mode</button><button className={mode==='practice'?'btn-primary':'btn-secondary'} onClick={()=>setMode('practice')}>Practice Mode</button></div>
    </div>

    {mode === 'learn' ? <div className="grid gap-6 lg:grid-cols-[minmax(280px,560px)_1fr]">
      <div className="mx-auto aspect-square w-[min(100%,560px)] rounded-[2rem] border border-white/10 bg-white/[.08] p-3 shadow-glow backdrop-blur"><Chessboard options={{ position: boardState.fen, boardOrientation, allowDragging:false, onPieceClick:({ square })=>showLegalMoveHints(square), onSquareClick:handleSquareClick, squareStyles:moveHints, showNotation:true, boardStyle:{borderRadius:'1.25rem',overflow:'hidden'}, darkSquareStyle:{backgroundColor:'#7a4f2d'}, lightSquareStyle:{backgroundColor:'#f7e4bf'} }} /></div>
      <aside className="space-y-5 rounded-[2rem] border border-white/10 bg-white/[.08] p-6 backdrop-blur">
        <OpeningProgress progress={progress}/>
        <p className="leading-7 text-cream/75">{opening.description}</p>
        {boardState.error && <p className="rounded-2xl bg-rose-400/15 p-4 font-bold text-rose-100">{boardState.error}</p>}
        <div><h2 className="text-xl font-black">Ý tưởng chính</h2><ul className="mt-3 space-y-2 text-cream/70">{opening.mainIdeas.map(i=><li key={i}>• {i}</li>)}</ul></div>
        <div className="rounded-2xl bg-ink/45 p-4"><b>Giải thích nước hiện tại:</b><p className="mt-2 text-cream/70">{currentMove ? `${currentMove.san}: ${currentMove.explanation}` : 'Bấm Bước tiếp theo để bắt đầu replay line.'}</p></div>
        <OpeningMoveList moves={opening.moves} currentIndex={currentIndex}/>
        <div className="flex flex-wrap gap-3"><button className="btn-secondary" onClick={()=>goToMove(Math.max(-1,currentIndex-1))}>Bước trước</button><button className="btn-primary" onClick={()=>goToMove(Math.min(opening.moves.length-1,currentIndex+1))}>Bước tiếp theo</button><button className="btn-secondary" onClick={()=>goToMove(-1)}>Về đầu</button><button className="btn-secondary" onClick={()=>setMode('practice')}>Chuyển sang luyện tập</button></div>
        <div><h2 className="text-xl font-black">Lỗi thường gặp</h2><ul className="mt-3 space-y-2 text-cream/70">{opening.commonMistakes.map(i=><li key={i}>• {i}</li>)}</ul></div>
        <OpeningCoachPanel opening={opening}/>
      </aside>
    </div> : <OpeningTrainerBoard opening={opening} onProgress={setProgress} />}
  </section>;
}
