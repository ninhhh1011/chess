import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import StatusBadge from './StatusBadge';
import { getChessStatus, getTurnLabel } from '../utils/chessStatus';
import { getRandomBotMove, BOT_LEVELS, getBotLevelByElo } from '../utils/randomBot';
import { playCaptureSound, playMoveSound, playStartSound } from '../utils/sound';

const GAME_MODES = {
  LOCAL: 'local',
  BOT: 'bot',
};

const YOUTUBE_BACKGROUND_MUSIC_URL = 'https://www.youtube.com/embed/IfMv0pJJtAA?autoplay=1&loop=1&playlist=IfMv0pJJtAA&controls=1&modestbranding=1&rel=0';

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

const fixedBoardStyle = {
  width: '100%',
  maxWidth: '620px',
  aspectRatio: '1 / 1',
  border: '0',
  borderRadius: '1.35rem',
  overflow: 'hidden',
  boxShadow: 'none',
};

const stableSquareStyle = {
  boxSizing: 'border-box',
  border: '0',
  outline: '0',
  boxShadow: 'none',
};

export default function ChessGameBoard() {
  const [game, setGame] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);
  const [gameMode, setGameMode] = useState(GAME_MODES.LOCAL);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botElo, setBotElo] = useState(800);
  const [moveHints, setMoveHints] = useState({});
  const [startNotice, setStartNotice] = useState(true);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [resultNotice, setResultNotice] = useState(null);
  const status = useMemo(() => getChessStatus(game), [game]);
  const history = game.history();

  useEffect(() => {
    if (!startNotice) return undefined;

    const timerId = window.setTimeout(() => {
      setStartNotice(false);
    }, 2600);

    return () => window.clearTimeout(timerId);
  }, [startNotice]);

  useEffect(() => {
    if (!game.isGameOver()) {
      setResultNotice(null);
      return;
    }

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Đen' : 'Trắng';
      setResultNotice(`${winner} thắng bằng chiếu hết!`);
      return;
    }

    setResultNotice('Ván cờ hòa!');
  }, [game]);

  function showStartNotice() {
    setStartNotice(false);
    playStartSound();
    window.setTimeout(() => setStartNotice(true), 0);
  }

  function toggleMusic() {
    setIsMusicOn((currentValue) => !currentValue);
  }

  function ensureMusicAfterInteraction() {
    // YouTube autoplay with sound depends on browser policy.
    // Keeping this hook makes it easy to add player API control later.
  }

  function cloneGame(currentGame = game) {
    const copy = new Chess();
    copy.loadPgn(currentGame.pgn());
    return copy;
  }

  function isGameOver(currentGame) {
    return currentGame.isGameOver();
  }

  function makeRandomBotMove(afterPlayerGame) {
    if (gameMode !== GAME_MODES.BOT || afterPlayerGame.turn() !== 'b' || isGameOver(afterPlayerGame)) {
      return;
    }

    setIsBotThinking(true);
    setMoveHints({});

    window.setTimeout(() => {
      const botGame = cloneGame(afterPlayerGame);
      if (isGameOver(botGame)) {
        setIsBotThinking(false);
        return;
      }

      const botMove = getRandomBotMove(botGame, botElo);
      if (botMove) {
        botGame.move(botMove);
        if (botMove.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
        setGame(botGame);
      }
      setIsBotThinking(false);
    }, 450);
  }

  function safeGameMutate(modify) {
    const copy = cloneGame();
    modify(copy);
    setGame(copy);
    return copy;
  }

  function startNewGame() {
    ensureMusicAfterInteraction();
    setGame(new Chess());
    setIsBotThinking(false);
    setMoveHints({});
    setSelectedSquare(null);
    setResultNotice(null);
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
  }

  function changeGameMode(nextMode) {
    setGameMode(nextMode);
    setGame(new Chess());
    setIsBotThinking(false);
    setMoveHints({});
    setSelectedSquare(null);
    setResultNotice(null);
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
  }

  function canDragPiece({ piece }) {
    if (isBotThinking || isGameOver(game) || !piece?.pieceType) return false;

    const pieceColor = piece.pieceType[0];
    if (gameMode === GAME_MODES.BOT) {
      return game.turn() === 'w' && pieceColor === 'w';
    }
    return pieceColor === game.turn();
  }

  function showLegalMoveHints(square) {
    const piece = game.get(square);
    if (!piece || piece.color !== game.turn() || isBotThinking || isGameOver(game)) {
      if (!selectedSquare) {
        setMoveHints({});
      }
      return;
    }
    if (gameMode === GAME_MODES.BOT && piece.color !== 'w') {
      if (!selectedSquare) {
        setMoveHints({});
      }
      return;
    }
    const moves = game.moves({ square, verbose: true });
    const nextHints = moves.reduce((styles, move) => {
      styles[move.to] = move.captured ? captureRingStyle : moveDotStyle;
      return styles;
    }, {});
    setSelectedSquare(square);
    setMoveHints(nextHints);
  }

  function clearMoveHints() {
    setMoveHints({});
  }

  function clearSelection() {
    setSelectedSquare(null);
    setMoveHints({});
  }

  function makeMove(sourceSquare, targetSquare) {
    ensureMusicAfterInteraction();
    if (!targetSquare || isBotThinking || isGameOver(game)) return false;
    if (gameMode === GAME_MODES.BOT && game.turn() !== 'w') return false;

    let move = null;
    const nextGame = safeGameMutate(g => {
      move = g.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    });

    clearSelection();
    if (!move) return false;
    if (move.captured) {
      playCaptureSound();
    } else {
      playMoveSound();
    }
    makeRandomBotMove(nextGame);
    return true;
  }

  function onDrop({ sourceSquare, targetSquare }) {
    return makeMove(sourceSquare, targetSquare);
  }

  function handleSquareClick({ square }) {
    if (selectedSquare && moveHints[square]) {
      makeMove(selectedSquare, square);
      return;
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      showLegalMoveHints(square);
      return;
    }

    clearSelection();
  }

  function undoMove() {
    const nextGame = safeGameMutate(g => {
      g.undo();
      if (gameMode === GAME_MODES.BOT && g.turn() === 'b') {
        g.undo();
      }
    });
    setIsBotThinking(false);
    clearSelection();
    return nextGame;
  }

  return <div className="relative grid gap-6 lg:grid-cols-[minmax(280px,620px)_1fr]">
    {startNotice && <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 animate-[notice-pop_2.6s_ease-in-out_forwards] rounded-full border border-gold/40 bg-ink/90 px-6 py-3 text-center font-black text-gold shadow-glow backdrop-blur-xl">
      ♔ Bắt đầu ván cờ!
    </div>}
    {isMusicOn && <iframe
      className="pointer-events-none absolute h-0 w-0 opacity-0"
      title="Nhạc nền Vua Cờ"
      src={YOUTUBE_BACKGROUND_MUSIC_URL}
      allow="autoplay; encrypted-media"
    />}
    {resultNotice && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/65 px-4 backdrop-blur-sm">
      <div className="max-w-md rounded-[2rem] border border-gold/40 bg-ink/95 p-8 text-center shadow-glow">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gold text-4xl text-ink">♔</div>
        <h2 className="text-3xl font-black text-gold">Kết thúc ván đấu</h2>
        <p className="mt-4 text-xl font-bold text-cream">{resultNotice}</p>
        <button className="btn-primary mt-6" onClick={startNewGame}>Chơi ván mới</button>
      </div>
    </div>}
    <section className="mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.08] p-4 shadow-glow backdrop-blur box-border">
      <Chessboard key={boardKey} options={{
        position: game.fen(),
        onPieceDrop: onDrop,
        canDragPiece: canDragPiece,
        onMouseOverSquare: ({ square }) => {
          if (game.get(square)) {
            showLegalMoveHints(square);
          }
        },
        onMouseOutSquare: () => {},
        onPieceClick: ({ square }) => showLegalMoveHints(square),
        onSquareClick: handleSquareClick,
        squareStyles: moveHints,
        boardStyle: fixedBoardStyle,
        squareStyle: stableSquareStyle,
        showNotation: false,
        showAnimations: true,
        animationDurationInMs: 120,
        darkSquareStyle: { backgroundColor: '#8a5a32', ...stableSquareStyle },
        lightSquareStyle: { backgroundColor: '#f4ddb5', ...stableSquareStyle },
      }} />
    </section>
    <aside className="rounded-[2rem] border border-white/10 bg-white/[.08] p-6 backdrop-blur">
      <label className="text-sm font-bold uppercase tracking-[0.2em] text-cream/45" htmlFor="game-mode">Chế độ chơi</label>
      <select id="game-mode" value={gameMode} onChange={(event) => changeGameMode(event.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 font-bold text-cream outline-none transition focus:border-gold">
        <option value={GAME_MODES.LOCAL}>2 người chơi</option>
        <option value={GAME_MODES.BOT}>Chơi với bot</option>
      </select>

      {gameMode === GAME_MODES.BOT && <div className="mt-5 rounded-2xl border border-white/10 bg-ink/35 p-4">
        <label className="text-sm font-bold uppercase tracking-[0.2em] text-cream/45" htmlFor="bot-elo">Mức độ bot</label>
        <select id="bot-elo" value={botElo} onChange={(event) => setBotElo(Number(event.target.value))} className="mt-3 w-full rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 font-bold text-cream outline-none transition focus:border-gold">
          {BOT_LEVELS.map((level) => <option key={level.elo} value={level.elo}>{level.label}</option>)}
        </select>
        <p className="mt-3 text-sm leading-6 text-cream/60">
          {getBotLevelByElo(botElo).elo < 1200
            ? 'Bot sẽ đi ngẫu nhiên nhiều hơn, phù hợp để luyện cơ bản.'
            : 'Bot ưu tiên ăn quân, chiếu và các nước mạnh hơn nhưng vẫn chưa phải Stockfish.'}
        </p>
      </div>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <StatusBadge label={status.label} tone={status.tone}/>
        <StatusBadge label={isBotThinking ? 'Bot đang nghĩ...' : getTurnLabel(game)} tone="muted"/>
      </div>
      <p className="mt-4 rounded-2xl bg-ink/45 p-4 text-sm leading-6 text-cream/65">
        {gameMode === GAME_MODES.BOT ? `Bạn cầm quân trắng. Bot random cầm quân đen ở mức ${botElo} ELO và sẽ tự đi sau mỗi nước hợp lệ của bạn.` : 'Hai người chơi lần lượt trên cùng một thiết bị.'}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-primary" onClick={startNewGame}>Ván mới</button>
        <button className="btn-secondary" onClick={undoMove}>Hoàn tác nước đi</button>
        <button className="btn-secondary" onClick={toggleMusic}>{isMusicOn ? 'Tắt nhạc nền' : 'Bật nhạc nền'}</button>
      </div>
      <h3 className="mt-8 text-xl font-extrabold">Lịch sử nước đi</h3>
      <div className="mt-4 max-h-80 overflow-auto rounded-2xl bg-ink/45 p-4">
        {history.length ? <ol className="grid grid-cols-2 gap-2 text-sm text-cream/80">{history.map((m,i)=><li key={i} className="rounded-xl bg-white/5 px-3 py-2"><b>{i+1}.</b> {m}</li>)}</ol> : <p className="text-cream/55">Chưa có nước đi nào.</p>}
      </div>
    </aside>
  </div>;
}
