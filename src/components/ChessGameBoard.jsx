import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import StatusBadge from './StatusBadge';
import { getChessStatus, getTurnLabel } from '../utils/chessStatus';
import { getBotMove, uciToMoveObject } from '../services/botService';
import { BOT_ELO_LEVELS } from '../data/botLevels';
import { playCaptureSound, playMoveSound, playStartSound } from '../utils/sound';
import AICoachPanel from './AICoachPanel';
import EngineAnalysisPanel from './analysis/EngineAnalysisPanel';
import { analyzeFen } from '../services/stockfishService';
import { getSanFromUci, classifyMoveLoss } from '../utils/chessMoveUtils';
import { addMistake, updateAfterGame } from '../services/userProfileService';

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
  height: '100%',
  aspectRatio: '1 / 1',
  border: '0',
  borderRadius: 'clamp(0.75rem, 3vw, 1.35rem)',
  overflow: 'hidden',
  boxShadow: 'none',
  touchAction: 'none',
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
  const [botElo, setBotElo] = useState(1200);
  const [botMoveSource, setBotMoveSource] = useState(null);
  const [botRequestId, setBotRequestId] = useState(0);
  const [moveHints, setMoveHints] = useState({});
  const [startNotice, setStartNotice] = useState(true);
  const [isMusicOn, setIsMusicOn] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [resultNotice, setResultNotice] = useState(null);
  const [recordedGamePgn, setRecordedGamePgn] = useState(null);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [autoComment, setAutoComment] = useState('');
  const [lastMoveFenPair, setLastMoveFenPair] = useState(null);
  const [review, setReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeTab, setActiveTab] = useState('moves');
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

    const currentPgn = game.pgn();
    if (recordedGamePgn !== currentPgn) {
      const result = game.isCheckmate() ? (game.turn() === 'w' ? 'black_win' : 'white_win') : 'draw';
      const mistakes = history.length < 12 ? ['opening_development'] : [];
      updateAfterGame({ result, movesCount: history.length, mistakes });
      setRecordedGamePgn(currentPgn);
    }

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Đen' : 'Trắng';
      setResultNotice(`${winner} thắng bằng chiếu hết!`);
      return;
    }

    setResultNotice('Ván cờ hòa!');
  }, [game, history.length, recordedGamePgn]);

  useEffect(() => {
    if (!autoAnalyze || !lastMoveFenPair) return;
    let cancelled = false;
    async function analyzeLastMove() {
      try {
        const before = await analyzeFen({ fen: lastMoveFenPair.beforeFen, depth: 8 });
        if (cancelled) return;
        const bestSan = before.bestMove ? getSanFromUci(lastMoveFenPair.beforeFen, before.bestMove) : 'không rõ';
        if (lastMoveFenPair.playedUci !== before.bestMove) {
          setAutoComment(`Nước này có thể chưa tối ưu. Engine gợi ý ${bestSan}.`);
        } else {
          setAutoComment(`Rất tốt! Bạn đã đi đúng nước engine gợi ý: ${bestSan}.`);
        }
      } catch {
        if (!cancelled) setAutoComment('Engine chưa sẵn sàng, vui lòng thử lại.');
      }
    }
    analyzeLastMove();
    return () => { cancelled = true; };
  }, [autoAnalyze, lastMoveFenPair]);

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

  async function makeRandomBotMove(afterPlayerGame) {
    if (gameMode !== GAME_MODES.BOT || afterPlayerGame.turn() !== 'b' || isGameOver(afterPlayerGame)) {
      return;
    }

    setIsBotThinking(true);
    setMoveHints({});
    setBotMoveSource(null);

    const currentRequestId = botRequestId + 1;
    setBotRequestId(currentRequestId);

    try {
      const fen = afterPlayerGame.fen();
      const result = await getBotMove({ fen, botElo });

      // Check if this request is still valid
      if (currentRequestId !== botRequestId + 1) {
        return;
      }

      if (!result || !result.move) {
        setIsBotThinking(false);
        return;
      }

      setBotMoveSource(result.source);

      const botGame = cloneGame(afterPlayerGame);
      if (isGameOver(botGame)) {
        setIsBotThinking(false);
        return;
      }

      const moveObj = uciToMoveObject(result.move);
      if (!moveObj) {
        setIsBotThinking(false);
        return;
      }

      const move = botGame.move(moveObj);
      if (move) {
        if (move.captured) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
        setGame(botGame);
      }
      setIsBotThinking(false);
    } catch (error) {
      console.error('[ChessGameBoard] Bot move error:', error);
      setIsBotThinking(false);
    }
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
    setBotRequestId((id) => id + 1);
    setBotMoveSource(null);
    setMoveHints({});
    setSelectedSquare(null);
    setResultNotice(null);
    setRecordedGamePgn(null);
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
  }

  function changeGameMode(nextMode) {
    setGameMode(nextMode);
    setGame(new Chess());
    setIsBotThinking(false);
    setBotRequestId((id) => id + 1);
    setBotMoveSource(null);
    setMoveHints({});
    setSelectedSquare(null);
    setResultNotice(null);
    setRecordedGamePgn(null);
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
    setLastMoveFenPair({ beforeFen: game.fen(), afterFen: nextGame.fen(), playedUci: `${move.from}${move.to}${move.promotion || ''}` });
    makeRandomBotMove(nextGame);
    return true;
  }

  async function reviewGameWithEngine() {
    const moves = game.history({ verbose: true }).slice(-20);
    if (!moves.length) return;
    setIsReviewing(true);
    const replay = new Chess();
    const results = [];
    try {
      for (let index = 0; index < moves.length; index += 1) {
        const beforeFen = replay.fen();
        const played = moves[index];
        const before = await analyzeFen({ fen: beforeFen, depth: 8 });
        replay.move(played.san);
        const after = await analyzeFen({ fen: replay.fen(), depth: 6 });
        const classification = classifyMoveLoss(before.evaluation, after.evaluation);
        const bestSan = before.bestMove ? getSanFromUci(beforeFen, before.bestMove) : 'không rõ';
        results.push({ index, playedSan: played.san, bestSan, classification });
      }
      const counts = { good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
      results.forEach((item) => { counts[item.classification.type] = (counts[item.classification.type] || 0) + 1; });
      const worstMoves = results.filter((item) => item.classification.type !== 'good').slice(-3);
      if (counts.blunder) addMistake('engine_blunder');
      if (counts.mistake || counts.inaccuracy) addMistake('engine_mistake');
      setReview({ total: results.length, counts, worstMoves });
    } finally {
      setIsReviewing(false);
    }
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

  const tabs = [
    { id: 'moves', label: 'Nước đi' },
    { id: 'analysis', label: 'Phân tích' },
    { id: 'coach', label: 'AI Coach' },
  ];

  return <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
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

    <section className="rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-white/[.10] via-white/[.055] to-gold/[.06] p-4 shadow-glow backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-gold/75">Vua Cờ · Play</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">Chơi cờ</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-cream/60">Bàn cờ là trung tâm. Các công cụ phân tích, lịch sử và Coach được gom gọn ở panel bên phải.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={status.label} tone={status.tone}/>
          <StatusBadge label={isBotThinking ? 'Bot đang nghĩ...' : getTurnLabel(game)} tone="muted"/>
        </div>
      </div>

      <div className="mx-auto aspect-square w-[min(100%,calc(100svw-2rem),720px)] max-w-[720px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[.08] p-2 shadow-glow backdrop-blur box-border sm:p-4">
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
          showNotation: true,
          showAnimations: true,
          animationDurationInMs: 120,
          darkSquareStyle: { backgroundColor: '#8a5a32', ...stableSquareStyle },
          lightSquareStyle: { backgroundColor: '#f4ddb5', ...stableSquareStyle },
        }} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-[1.5rem] bg-ink/45 p-4 text-sm leading-6 text-cream/65">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-cream/40" htmlFor="game-mode">Chế độ chơi</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select id="game-mode" value={gameMode} onChange={(event) => changeGameMode(event.target.value)} className="rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 font-bold text-cream outline-none transition focus:border-gold">
              <option value={GAME_MODES.LOCAL}>2 người chơi</option>
              <option value={GAME_MODES.BOT}>Chơi với bot</option>
            </select>
            {gameMode === GAME_MODES.BOT && <select id="bot-elo" value={botElo} onChange={(event) => setBotElo(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 font-bold text-cream outline-none transition focus:border-gold">
              {BOT_ELO_LEVELS.map((level) => <option key={level.elo} value={level.elo}>{level.label} - {level.description}</option>)}
            </select>}
          </div>
          {gameMode === GAME_MODES.BOT && (
            <div className="mt-3 space-y-2">
              <p>Bạn cầm quân trắng. Bot <strong>{BOT_ELO_LEVELS.find(l => l.elo === botElo)?.label}</strong> sẽ tự đi sau mỗi nước hợp lệ của bạn.</p>
              {botMoveSource && (
                <p className="text-xs">
                  {botMoveSource === 'stockfish_wasm' && <span className="text-gold">✓ Engine: Stockfish WASM</span>}
                  {botMoveSource === 'random_weak' && <span className="text-amber-400">○ Bot chơi yếu (ELO thấp)</span>}
                  {botMoveSource === 'fallback' && <span className="text-red-400">⚠ Engine: Fallback cơ bản (Stockfish không khả dụng)</span>}
                </p>
              )}
              {isBotThinking && <p className="text-xs text-cream/60">Bot đang suy nghĩ...</p>}
            </div>
          )}
          {gameMode === GAME_MODES.LOCAL && <p className="mt-3">Hai người chơi lần lượt trên cùng một thiết bị.</p>}
        </div>
        <div className="flex flex-wrap content-start gap-3 lg:justify-end">
          <button className="btn-primary" onClick={startNewGame}>Ván mới</button>
          <button className="btn-secondary" onClick={undoMove}>Hoàn tác</button>
          <button className="btn-secondary" onClick={toggleMusic}>{isMusicOn ? 'Tắt nhạc' : 'Bật nhạc'}</button>
        </div>
      </div>
    </section>

    <aside className="rounded-[2.25rem] border border-white/10 bg-white/[.075] p-3 shadow-glow backdrop-blur-xl sm:p-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-hidden">
      <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-ink/55 p-2">
        {tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-2xl px-3 py-3 text-sm font-black transition ${activeTab === tab.id ? 'bg-gold text-ink shadow-glow' : 'text-cream/60 hover:bg-white/10 hover:text-cream'}`}>{tab.label}</button>)}
      </div>

      <div className="mt-4 xl:max-h-[calc(100vh-9rem)] xl:overflow-auto">
        {activeTab === 'moves' && <section className="rounded-[1.75rem] bg-ink/35 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-gold/70">Move list</p>
              <h2 className="mt-1 text-2xl font-black">Lịch sử nước đi</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cream/60">{history.length} nước</span>
          </div>
          <div className="mt-5 max-h-[32rem] overflow-auto rounded-2xl bg-ink/55 p-4">
            {history.length ? <ol className="grid grid-cols-2 gap-2 text-sm text-cream/80">{history.map((m,i)=><li key={i} className="rounded-xl bg-white/5 px-3 py-2"><b className="text-gold">{i+1}.</b> {m}</li>)}</ol> : <p className="text-cream/55">Chưa có nước đi nào.</p>}
          </div>
        </section>}

        {activeTab === 'analysis' && <EngineAnalysisPanel
          fen={game.fen()}
          autoAnalyze={autoAnalyze}
          onAutoAnalyzeChange={setAutoAnalyze}
          autoComment={autoComment}
          review={review}
          isReviewing={isReviewing}
          onReview={reviewGameWithEngine}
        />}

        {activeTab === 'coach' && <AICoachPanel
          fen={game.fen()}
          pgn={game.pgn()}
          history={history}
          turn={game.turn()}
          status={status.label}
        />}
      </div>
    </aside>
  </div>;
}
