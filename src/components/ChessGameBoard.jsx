import { useEffect, useMemo, useRef, useState } from 'react';
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
import coachAvatar from '../assets/avatarcoach.webp';

const GAME_MODES = {
  LOCAL: 'local',
  BOT: 'bot',
};

const PLAYER_COLORS = {
  WHITE: 'w',
  BLACK: 'b',
};

const BOT_NAME = 'ninh lốp trưởng';

const moveDotStyle = {
  backgroundImage: 'radial-gradient(circle, rgba(23,18,13,0.38) 0 14%, transparent 15%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
};

const captureRingStyle = {
  backgroundImage: 'none',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
  boxShadow: 'inset 0 0 0 3px rgba(23,18,13,0.35)',
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

const selectedSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(247, 183, 49, 0.72)',
};

const lastMoveSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.38)',
};

const engineFromSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(247, 183, 49, 0.7)',
};

const engineToSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(247, 183, 49, 0.7)',
  backgroundImage: 'radial-gradient(circle, rgba(23,18,13,0.28) 0 14%, transparent 15%)',
};

const PIECE_LABELS = {
  p: 'Tốt',
  n: 'Mã',
  b: 'Tượng',
  r: 'Xe',
  q: 'Hậu',
  k: 'Vua',
};

function getPieceLabel(piece) {
  if (!piece) return 'Quân';
  return `${PIECE_LABELS[piece.type] || 'Quân'} ${piece.color === 'w' ? 'trắng' : 'đen'}`;
}

function parseUciMove(uci) {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : '',
  };
}

function resolveSquare(eventOrSquare) {
  if (typeof eventOrSquare === 'string') return eventOrSquare;
  return eventOrSquare?.square || eventOrSquare?.sourceSquare || eventOrSquare?.targetSquare || null;
}

function getLastMoveSquares(currentGame) {
  const lastMove = currentGame.history({ verbose: true }).at(-1);
  return lastMove ? { from: lastMove.from, to: lastMove.to } : null;
}

function describeEngineMove(hint) {
  const parsed = parseUciMove(hint?.bestMove);
  if (!parsed || !hint?.fen) return null;

  try {
    const hintGame = new Chess(hint.fen);
    const piece = hintGame.get(parsed.from);
    return {
      ...parsed,
      pieceLabel: getPieceLabel(piece),
      san: getSanFromUci(hint.fen, hint.bestMove),
    };
  } catch {
    return {
      ...parsed,
      pieceLabel: 'Quân',
      san: hint.bestMove,
    };
  }
}

export default function ChessGameBoard() {
  const [game, setGame] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);
  const [gameMode, setGameMode] = useState(GAME_MODES.BOT);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botElo, setBotElo] = useState(1200);
  const [playerColor, setPlayerColor] = useState(PLAYER_COLORS.WHITE);
  const [botMoveSource, setBotMoveSource] = useState(null);
  const [botRequestId, setBotRequestId] = useState(0);
  const botRequestIdRef = useRef(0);
  const [moveHints, setMoveHints] = useState({});
  const [engineHint, setEngineHint] = useState(null);
  const [lastMoveSquares, setLastMoveSquares] = useState(null);
  const [startNotice, setStartNotice] = useState(true);
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
  const selectedBotLevel = BOT_ELO_LEVELS.find((level) => level.elo === botElo) || BOT_ELO_LEVELS[2];
  const playerColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'trắng' : 'đen';
  const botColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'đen' : 'trắng';
  const boardOrientation = playerColor === PLAYER_COLORS.BLACK ? 'black' : 'white';
  const selectedPiece = selectedSquare ? game.get(selectedSquare) : null;
  const selectedLegalMoves = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : [];
  const engineMove = useMemo(() => describeEngineMove(engineHint), [engineHint]);
  const boardSquareStyles = useMemo(() => {
    const styles = { ...moveHints };

    if (lastMoveSquares?.from) styles[lastMoveSquares.from] = { ...styles[lastMoveSquares.from], ...lastMoveSquareStyle };
    if (lastMoveSquares?.to) styles[lastMoveSquares.to] = { ...styles[lastMoveSquares.to], ...lastMoveSquareStyle };
    if (engineMove?.from) styles[engineMove.from] = { ...styles[engineMove.from], ...engineFromSquareStyle };
    if (engineMove?.to) styles[engineMove.to] = { ...styles[engineMove.to], ...engineToSquareStyle };
    if (selectedSquare) styles[selectedSquare] = { ...styles[selectedSquare], ...selectedSquareStyle };

    return styles;
  }, [engineMove, lastMoveSquares, moveHints, selectedSquare]);

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
        const before = await analyzeFen({ fen: lastMoveFenPair.beforeFen, depth: 6, movetime: 450 });
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

  function cloneGame(currentGame = game) {
    const copy = new Chess();
    copy.loadPgn(currentGame.pgn());
    return copy;
  }

  function isGameOver(currentGame) {
    return currentGame.isGameOver();
  }

  async function makeRandomBotMove(afterPlayerGame, activePlayerColor = playerColor, activeGameMode = gameMode) {
    if (activeGameMode !== GAME_MODES.BOT || afterPlayerGame.turn() === activePlayerColor || isGameOver(afterPlayerGame)) {
      return;
    }

    setIsBotThinking(true);
    setMoveHints({});
    setBotMoveSource(null);
    setEngineHint(null);

    botRequestIdRef.current += 1;
    const currentRequestId = botRequestIdRef.current;
    setBotRequestId(currentRequestId);

    try {
      const fen = afterPlayerGame.fen();
      const result = await getBotMove({ fen, botElo });

      if (currentRequestId !== botRequestIdRef.current) {
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
        setLastMoveSquares({ from: move.from, to: move.to });
        setGame(botGame);
      }
      setIsBotThinking(false);
    } catch (error) {
      console.error('[ChessGameBoard] Bot move error:', error);
      setIsBotThinking(false);
    }
  }

  function startNewGame() {
    const nextGame = new Chess();
    setGame(nextGame);
    setIsBotThinking(false);
    botRequestIdRef.current += 1;
    setBotRequestId(botRequestIdRef.current);
    setBotMoveSource(null);
    setMoveHints({});
    setEngineHint(null);
    setLastMoveSquares(null);
    setSelectedSquare(null);
    setResultNotice(null);
    setRecordedGamePgn(null);
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
    makeRandomBotMove(nextGame, playerColor, gameMode);
  }

  function changeGameMode(nextMode) {
    const nextGame = new Chess();
    setGameMode(nextMode);
    setGame(nextGame);
    setIsBotThinking(false);
    botRequestIdRef.current += 1;
    setBotRequestId(botRequestIdRef.current);
    setBotMoveSource(null);
    setMoveHints({});
    setEngineHint(null);
    setLastMoveSquares(null);
    setSelectedSquare(null);
    setResultNotice(null);
    setRecordedGamePgn(null);
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
    makeRandomBotMove(nextGame, playerColor, nextMode);
  }

  function changePlayerColor(nextColor) {
    const nextGame = new Chess();
    setPlayerColor(nextColor);
    setGame(nextGame);
    setIsBotThinking(false);
    botRequestIdRef.current += 1;
    setBotRequestId(botRequestIdRef.current);
    setBotMoveSource(null);
    setMoveHints({});
    setEngineHint(null);
    setLastMoveSquares(null);
    setSelectedSquare(null);
    setResultNotice(null);
    setRecordedGamePgn(null);
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
    makeRandomBotMove(nextGame, nextColor, gameMode);
  }

  function canDragPiece({ piece }) {
    if (isBotThinking || isGameOver(game) || !piece?.pieceType) return false;

    const pieceColor = piece.pieceType[0];
    if (gameMode === GAME_MODES.BOT) {
      return game.turn() === playerColor && pieceColor === playerColor;
    }
    return pieceColor === game.turn();
  }

  function showLegalMoveHints(eventOrSquare) {
    const square = resolveSquare(eventOrSquare);
    if (!square) return;

    const piece = game.get(square);
    if (!piece || piece.color !== game.turn() || isBotThinking || isGameOver(game)) {
      if (!selectedSquare) {
        setMoveHints({});
      }
      return;
    }
    if (gameMode === GAME_MODES.BOT && piece.color !== playerColor) {
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
    sourceSquare = resolveSquare(sourceSquare);
    targetSquare = resolveSquare(targetSquare);

    if (!sourceSquare || !targetSquare || sourceSquare === targetSquare || isBotThinking || isGameOver(game)) return false;
    if (gameMode === GAME_MODES.BOT && game.turn() !== playerColor) return false;

    const nextGame = cloneGame();
    let move = null;
    try {
      move = nextGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      return false;
    }
    if (!move) return false;

    clearSelection();
    setEngineHint(null);
    if (move.captured) {
      playCaptureSound();
    } else {
      playMoveSound();
    }
    setLastMoveSquares({ from: move.from, to: move.to });
    setGame(nextGame);
    setLastMoveFenPair({ beforeFen: game.fen(), afterFen: nextGame.fen(), playedUci: `${move.from}${move.to}${move.promotion || ''}` });
    makeRandomBotMove(nextGame, playerColor, gameMode);
    return true;
  }

  async function reviewGameWithEngine() {
    const moves = game.history({ verbose: true }).slice(-12);
    if (!moves.length) return;
    setIsReviewing(true);
    const replay = new Chess();
    const results = [];
    try {
      for (let index = 0; index < moves.length; index += 1) {
        const beforeFen = replay.fen();
        const played = moves[index];
        const before = await analyzeFen({ fen: beforeFen, depth: 6, movetime: 450 });
        replay.move(played.san);
        const after = await analyzeFen({ fen: replay.fen(), depth: 5, movetime: 350 });
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

  function onDrop(event) {
    return makeMove(event?.sourceSquare, event?.targetSquare);
  }

  function handleSquareClick(eventOrSquare) {
    const square = resolveSquare(eventOrSquare);
    if (!square) return;

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
    const nextGame = cloneGame();

    if (gameMode === GAME_MODES.BOT) {
      botRequestIdRef.current += 1;

      const lastMove = nextGame.history({ verbose: true }).at(-1);
      if (lastMove?.color !== playerColor) {
        nextGame.undo();
      }

      const previousMove = nextGame.history({ verbose: true }).at(-1);
      if (previousMove?.color === playerColor) {
        nextGame.undo();
      }
    } else {
      nextGame.undo();
    }

    setGame(nextGame);
    setIsBotThinking(false);
    setBotRequestId(botRequestIdRef.current);
    setEngineHint(null);
    setLastMoveSquares(getLastMoveSquares(nextGame));
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

      {gameMode === GAME_MODES.BOT && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-gold/20 bg-ink/45 p-4">
          <div className="flex min-w-0 items-center gap-4">
            <img src={coachAvatar} alt={`Avatar ${BOT_NAME}`} className="h-16 w-16 flex-none rounded-2xl border border-gold/40 object-cover shadow-glow" />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-gold/70">Đối thủ</p>
              <h2 className="mt-1 truncate text-2xl font-black text-cream">{BOT_NAME}</h2>
              <p className="mt-1 text-sm font-semibold text-cream/55">Bạn cầm {playerColorLabel}. {BOT_NAME} cầm {botColorLabel}.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.08] px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cream/45">ELO đang đấu</p>
            <p className="mt-1 text-3xl font-black text-gold">{selectedBotLevel.elo}</p>
            <p className="text-sm font-bold text-cream/60">{selectedBotLevel.description}</p>
          </div>
        </div>
      )}

      <div className="mx-auto aspect-square w-[min(100%,calc(100svw-2rem),720px)] max-w-[720px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[.08] p-2 shadow-glow backdrop-blur box-border sm:p-4">
        <Chessboard key={boardKey} options={{
          position: game.fen(),
          boardOrientation,
          onPieceDrop: onDrop,
          canDragPiece: canDragPiece,
          onPieceClick: showLegalMoveHints,
          onPieceDrag: showLegalMoveHints,
          onSquareClick: handleSquareClick,
          squareStyles: boardSquareStyles,
          boardStyle: fixedBoardStyle,
          squareStyle: stableSquareStyle,
          showNotation: true,
          showAnimations: true,
          animationDurationInMs: 120,
          darkSquareStyle: { backgroundColor: '#8a5a32', ...stableSquareStyle },
          lightSquareStyle: { backgroundColor: '#f4ddb5', ...stableSquareStyle },
        }} />
      </div>

      <div className="mx-auto mt-4 grid w-[min(100%,720px)] gap-3 text-sm">
        {engineMove ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-cream">
            <p>
              <b className="text-gold">Gợi ý engine:</b> {engineMove.pieceLabel} từ <b className="text-gold">{engineMove.from}</b> đến <b className="text-gold">{engineMove.to}</b>
              {engineMove.san && <span className="text-cream/60"> ({engineMove.san})</span>}
            </p>
            <button type="button" className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-black text-cream/70 hover:border-gold/60 hover:text-gold" onClick={() => setEngineHint(null)}>Ẩn</button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-ink/35 px-4 py-3 text-cream/60">
            {selectedPiece ? (
              <span>Đang chọn <b className="text-gold">{getPieceLabel(selectedPiece)}</b> ở <b className="text-gold">{selectedSquare}</b>: {selectedLegalMoves.length} nước hợp lệ đang sáng trên bàn.</span>
            ) : (
              <span>Chọn một quân để xem các ô có thể đi. Khi engine gợi ý, ô xuất phát và ô đích sẽ sáng trực tiếp trên bàn.</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-[1.5rem] bg-ink/45 p-4 text-sm leading-6 text-cream/65">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-cream/40" htmlFor="game-mode">Chế độ chơi</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <select id="game-mode" value={gameMode} onChange={(event) => changeGameMode(event.target.value)} className="rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 font-bold text-cream outline-none transition focus:border-gold">
              <option value={GAME_MODES.LOCAL}>2 người chơi</option>
              <option value={GAME_MODES.BOT}>Đấu với {BOT_NAME}</option>
            </select>
            {gameMode === GAME_MODES.BOT && <select id="player-color" value={playerColor} onChange={(event) => changePlayerColor(event.target.value)} className="rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 font-bold text-cream outline-none transition focus:border-gold">
              <option value={PLAYER_COLORS.WHITE}>Bạn cầm trắng</option>
              <option value={PLAYER_COLORS.BLACK}>Bạn cầm đen</option>
            </select>}
            {gameMode === GAME_MODES.BOT && <select id="bot-elo" value={botElo} onChange={(event) => {
              setBotElo(Number(event.target.value));
            }} className="rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 font-bold text-cream outline-none transition focus:border-gold">
              {BOT_ELO_LEVELS.map((level) => <option key={level.elo} value={level.elo}>{level.label} - {level.description}</option>)}
            </select>}
          </div>
          {gameMode === GAME_MODES.BOT && (
            <div className="mt-3 space-y-2">
              <p>Bạn cầm quân {playerColorLabel}. <strong>{BOT_NAME}</strong> ở mức <strong>{selectedBotLevel.label}</strong> sẽ tự đi sau mỗi nước hợp lệ của bạn.</p>
              {botMoveSource && (
                <p className="text-xs">
                  {botMoveSource === 'stockfish_wasm' && <span className="text-gold">✓ Engine: Stockfish WASM</span>}
                  {botMoveSource === 'random_weak' && <span className="text-amber-400">○ Bot chơi yếu (ELO thấp)</span>}
                  {botMoveSource === 'fallback' && <span className="text-red-400">⚠ Engine: Fallback cơ bản (Stockfish không khả dụng)</span>}
                </p>
              )}
              {isBotThinking && <p className="text-xs text-cream/60">{BOT_NAME} đang suy nghĩ...</p>}
            </div>
          )}
          {gameMode === GAME_MODES.LOCAL && <p className="mt-3">Hai người chơi lần lượt trên cùng một thiết bị.</p>}
        </div>
        <div className="flex flex-wrap content-start gap-3 lg:justify-end">
          <button className="btn-primary" onClick={startNewGame}>Ván mới</button>
          <button className="btn-secondary" onClick={undoMove}>Hoàn tác</button>
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
          onBestMove={setEngineHint}
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
