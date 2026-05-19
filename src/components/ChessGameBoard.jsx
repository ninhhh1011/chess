import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import StatusBadge from './StatusBadge';
import { getChessStatus, getTurnLabel } from '../utils/chessStatus';
import { getBotMove, uciToMoveObject } from '../services/botService';
import { BOT_ELO_LEVELS } from '../data/botLevels';
import { playCaptureSound, playCheckSound, playMoveSound, playStartSound } from '../utils/sound';
import AICoachPanel from './AICoachPanel';
import EngineAnalysisPanel from './analysis/EngineAnalysisPanel';
import { standardPieces } from './chess/standardPieces';
import { analyzeFen } from '../services/stockfishService';
import { getSanFromUci, classifyMoveLoss, formatEvaluation } from '../utils/chessMoveUtils';
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
  backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.95) 0 13%, rgba(245,158,11,0.18) 14% 27%, transparent 28%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
  boxShadow: 'inset 0 0 0 2px rgba(245,158,11,0.28), 0 0 18px rgba(245,158,11,0.22)',
};

const captureRingStyle = {
  backgroundImage: 'radial-gradient(circle, transparent 0 48%, rgba(245,158,11,0.9) 49%, rgba(245,158,11,0.9) 58%, transparent 59%)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
  boxShadow: 'inset 0 0 0 2px rgba(245,158,11,0.45), 0 0 22px rgba(245,158,11,0.26)',
};

const fixedBoardStyle = {
  width: '100%',
  height: '100%',
  aspectRatio: '1 / 1',
  border: '0',
  borderRadius: 'clamp(0.75rem, 3vw, 1.35rem)',
  overflow: 'hidden',
  boxShadow: '0 24px 70px rgba(2,6,23,.45)',
  touchAction: 'none',
};

const stableSquareStyle = {
  boxSizing: 'border-box',
  border: '0',
  outline: '0',
  boxShadow: 'none',
  transition: 'background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
};

const selectedSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(245,158,11,0.78), 0 0 18px rgba(245,158,11,0.24)',
};

const lastMoveSquareStyle = {
  backgroundImage: 'linear-gradient(135deg, rgba(245,158,11,0.28), rgba(245,158,11,0.08))',
  boxShadow: 'inset 0 0 0 3px rgba(245,158,11,0.52), 0 0 22px rgba(245,158,11,0.20)',
};

const checkedKingSquareStyle = {
  backgroundImage: 'radial-gradient(circle, rgba(248,113,113,0.28) 0 62%, rgba(248,113,113,0.45) 63%, transparent 64%)',
  boxShadow: 'inset 0 0 0 4px rgba(248,113,113,0.84), 0 0 26px rgba(248,113,113,0.32)',
};

const engineFromSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(245,158,11,0.78), 0 0 20px rgba(245,158,11,0.26)',
};

const engineToSquareStyle = {
  boxShadow: 'inset 0 0 0 3px rgba(245,158,11,0.78), 0 0 20px rgba(245,158,11,0.26)',
  backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.34) 0 16%, transparent 17%)',
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

function getKingSquare(currentGame, color) {
  const files = 'abcdefgh';
  const board = currentGame.board();

  for (let rowIndex = 0; rowIndex < board.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < board[rowIndex].length; columnIndex += 1) {
      const piece = board[rowIndex][columnIndex];
      if (piece?.type === 'k' && piece.color === color) {
        return `${files[columnIndex]}${8 - rowIndex}`;
      }
    }
  }

  return null;
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

function getFenTurn(fen = '') {
  return fen.split(' ')[1] || 'w';
}

function evaluationToWhitePawns(evaluation, fen, source = 'stockfish_wasm') {
  if (!evaluation) return 0;

  const rawValue = evaluation.type === 'mate'
    ? (evaluation.value > 0 ? 99 : -99)
    : (Number(evaluation.value) || 0) / 100;

  if (source === 'fallback') {
    return rawValue;
  }

  return getFenTurn(fen) === 'b' ? -rawValue : rawValue;
}

function evaluationToPercent(analysis) {
  const pawns = evaluationToWhitePawns(analysis?.evaluation, analysis?.fen, analysis?.source);
  return Math.max(4, Math.min(96, 50 + Math.tanh(pawns / 4) * 44));
}

function evaluationForColor(analysis, color) {
  const whitePawns = evaluationToWhitePawns(analysis?.evaluation, analysis?.fen, analysis?.source);
  return color === 'w' ? whitePawns : -whitePawns;
}

function classifyMoveAnnotation({ before, after, playedUci, color }) {
  const beforeForMover = evaluationForColor(before, color);
  const afterForMover = evaluationForColor(after, color);
  const delta = afterForMover - beforeForMover;
  const loss = Math.max(0, -delta);
  const playedBestMove = Boolean(before?.bestMove && playedUci === before.bestMove);
  const bestSan = before?.bestMove ? getSanFromUci(before.fen, before.bestMove) : null;

  if ((playedBestMove && delta >= 1.5) || delta >= 2.2) {
    return { symbol: '!!', label: 'Thiên tài', tone: 'brilliant', loss, bestSan };
  }
  if (playedBestMove || loss < 0.25) {
    return { symbol: '!', label: 'Tốt nhất', tone: 'best', loss, bestSan };
  }
  if (loss < 0.8) {
    return { symbol: '?!', label: 'Không chính xác', tone: 'inaccuracy', loss, bestSan };
  }
  if (loss < 1.8) {
    return { symbol: '?', label: 'Sai lầm', tone: 'mistake', loss, bestSan };
  }

  return { symbol: '??', label: 'Sai lầm nghiêm trọng', tone: 'blunder', loss, bestSan };
}

function annotationClassName(tone) {
  const tones = {
    pending: 'border-slate-600 bg-slate-700 text-slate-200',
    brilliant: 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100',
    best: 'border-emerald-300/50 bg-emerald-400/15 text-emerald-100',
    inaccuracy: 'border-amber-300/50 bg-amber-400/15 text-amber-100',
    mistake: 'border-orange-300/50 bg-orange-400/15 text-orange-100',
    blunder: 'border-red-300/50 bg-red-500/15 text-red-100',
  };
  return tones[tone] || tones.pending;
}

function LiveEvaluationBar({ analysis, status }) {
  const whitePercent = evaluationToPercent(analysis);
  const display = analysis?.evaluation ? formatEvaluation(analysis.evaluation) : '0.00';
  const whitePawns = evaluationToWhitePawns(analysis?.evaluation, analysis?.fen, analysis?.source);
  const leader = Math.abs(whitePawns) < 0.2 ? 'Cân bằng' : (whitePawns > 0 ? 'Trắng hơn' : 'Đen hơn');

  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-2 sm:w-12">
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-[0.65rem] font-black text-amber-300 sm:text-xs">{display}</div>
      <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-full border border-slate-600 bg-slate-950 shadow-inner">
        <div className="absolute inset-x-0 bottom-0 bg-slate-100 transition-all duration-300" style={{ height: `${whitePercent}%` }} />
        <div className="absolute inset-x-0 top-1/2 h-px bg-amber-400/70" />
      </div>
      <div className="text-center text-[0.62rem] font-black uppercase leading-3 tracking-[0.12em] text-slate-400">{status || leader}</div>
    </div>
  );
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
  const lastCheckFenRef = useRef(null);
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
  const [moveAnnotations, setMoveAnnotations] = useState({});
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [liveEvalStatus, setLiveEvalStatus] = useState('Đang tải');
  const liveAnalysisRequestRef = useRef(0);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [analysisGame, setAnalysisGame] = useState(() => new Chess());
  const [analysisMainline, setAnalysisMainline] = useState([]);
  const [analysisPly, setAnalysisPly] = useState(0);
  const activeGame = analysisMode ? analysisGame : game;
  const status = useMemo(() => getChessStatus(activeGame), [activeGame]);
  const history = activeGame.history();
  const activeFen = activeGame.fen();
  const activePgn = activeGame.pgn();
  const selectedBotLevel = BOT_ELO_LEVELS.find((level) => level.elo === botElo) || BOT_ELO_LEVELS[2];
  const playerColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'trắng' : 'đen';
  const botColorLabel = playerColor === PLAYER_COLORS.WHITE ? 'đen' : 'trắng';
  const boardOrientation = playerColor === PLAYER_COLORS.BLACK ? 'black' : 'white';
  const checkedKingSquare = useMemo(() => activeGame.isCheck() ? getKingSquare(activeGame, activeGame.turn()) : null, [activeGame]);
  const checkedColorLabel = activeGame.turn() === PLAYER_COLORS.WHITE ? 'trắng' : 'đen';
  const selectedPiece = selectedSquare ? activeGame.get(selectedSquare) : null;
  const selectedLegalMoves = selectedSquare ? activeGame.moves({ square: selectedSquare, verbose: true }) : [];
  const engineMove = useMemo(() => describeEngineMove(engineHint), [engineHint]);
  const engineArrows = useMemo(() => engineMove ? [{
    startSquare: engineMove.from,
    endSquare: engineMove.to,
    color: 'rgba(245,158,11,0.88)',
  }] : [], [engineMove]);
  const boardSquareStyles = useMemo(() => {
    const styles = { ...moveHints };

    if (lastMoveSquares?.from) styles[lastMoveSquares.from] = { ...styles[lastMoveSquares.from], ...lastMoveSquareStyle };
    if (lastMoveSquares?.to) styles[lastMoveSquares.to] = { ...styles[lastMoveSquares.to], ...lastMoveSquareStyle };
    if (engineMove?.from) styles[engineMove.from] = { ...styles[engineMove.from], ...engineFromSquareStyle };
    if (engineMove?.to) styles[engineMove.to] = { ...styles[engineMove.to], ...engineToSquareStyle };
    if (selectedSquare) styles[selectedSquare] = { ...styles[selectedSquare], ...selectedSquareStyle };
    if (checkedKingSquare) styles[checkedKingSquare] = { ...styles[checkedKingSquare], ...checkedKingSquareStyle };

    return styles;
  }, [checkedKingSquare, engineMove, lastMoveSquares, moveHints, selectedSquare]);

  useEffect(() => {
    if (!startNotice) return undefined;

    const timerId = window.setTimeout(() => {
      setStartNotice(false);
    }, 2600);

    return () => window.clearTimeout(timerId);
  }, [startNotice]);

  useEffect(() => {
    if (!activeGame.isCheck()) {
      lastCheckFenRef.current = null;
      return;
    }

    const currentFen = activeGame.fen();
    if (lastCheckFenRef.current === currentFen) return;

    lastCheckFenRef.current = currentFen;
    playCheckSound();
  }, [activeGame]);

  useEffect(() => {
    if (!analysisMode && isBotThinking) {
      setLiveEvalStatus('Bot đang nghĩ');
      return undefined;
    }

    const requestId = liveAnalysisRequestRef.current + 1;
    liveAnalysisRequestRef.current = requestId;
    setLiveEvalStatus('Đang phân tích');

    const timerId = window.setTimeout(() => {
      analyzeFen({ fen: activeFen, depth: 8, movetime: 650 })
        .then((result) => {
          if (liveAnalysisRequestRef.current !== requestId) return;
          setLiveAnalysis(result);
          setLiveEvalStatus(result.source === 'fallback' ? 'Fallback' : 'Live');
        })
        .catch(() => {
          if (liveAnalysisRequestRef.current !== requestId) return;
          setLiveEvalStatus('Lỗi engine');
        });
    }, 180);

    return () => window.clearTimeout(timerId);
  }, [activeFen, analysisMode, isBotThinking]);

  useEffect(() => {
    if (!game.isGameOver()) {
      setResultNotice(null);
      return;
    }

    const currentPgn = game.pgn();
    if (recordedGamePgn !== currentPgn) {
      const result = game.isCheckmate() ? (game.turn() === 'w' ? 'black_win' : 'white_win') : 'draw';
      const gameHistory = game.history();
      const mistakes = gameHistory.length < 12 ? ['opening_development'] : [];
      updateAfterGame({ result, movesCount: gameHistory.length, mistakes });
      setRecordedGamePgn(currentPgn);
    }

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Đen' : 'Trắng';
      setResultNotice(`${winner} thắng bằng chiếu hết!`);
      return;
    }

    setResultNotice('Ván cờ hòa!');
  }, [game, recordedGamePgn]);

  useEffect(() => {
    if (!lastMoveFenPair) return;
    let cancelled = false;
    async function analyzeLastMove() {
      try {
        const before = await analyzeFen({ fen: lastMoveFenPair.beforeFen, depth: 8, movetime: 650 });
        if (cancelled) return;
        const after = await analyzeFen({ fen: lastMoveFenPair.afterFen, depth: 7, movetime: 550 });
        if (cancelled) return;

        const bestSan = before.bestMove ? getSanFromUci(lastMoveFenPair.beforeFen, before.bestMove) : 'không rõ';
        const annotation = classifyMoveAnnotation({
          before,
          after,
          playedUci: lastMoveFenPair.playedUci,
          color: lastMoveFenPair.color,
        });

        setMoveAnnotations((current) => ({
          ...current,
          [lastMoveFenPair.moveIndex]: annotation,
        }));

        if (!autoAnalyze) return;
        if (annotation.symbol === '!!' || annotation.symbol === '!') {
          setAutoComment(`${annotation.symbol} ${annotation.label}. Nước ${lastMoveFenPair.san} giữ thế rất ổn.`);
        } else {
          setAutoComment(`${annotation.symbol} ${annotation.label}. Engine thích ${bestSan} hơn.`);
        }
      } catch {
        if (!cancelled) {
          setMoveAnnotations((current) => ({
            ...current,
            [lastMoveFenPair.moveIndex]: { symbol: '...', label: 'Chưa phân tích được', tone: 'pending' },
          }));
          if (autoAnalyze) setAutoComment('Engine chưa sẵn sàng, vui lòng thử lại.');
        }
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
    const pgn = currentGame.pgn();
    if (pgn) copy.loadPgn(pgn);
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
    setAnalysisMode(false);
    setAnalysisGame(new Chess());
    setAnalysisMainline([]);
    setAnalysisPly(0);
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
    setMoveAnnotations({});
    setLastMoveFenPair(null);
    setLiveAnalysis(null);
    setLiveEvalStatus('Đang tải');
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
    makeRandomBotMove(nextGame, playerColor, gameMode);
  }

  function changeGameMode(nextMode) {
    const nextGame = new Chess();
    setAnalysisMode(false);
    setAnalysisGame(new Chess());
    setAnalysisMainline([]);
    setAnalysisPly(0);
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
    setMoveAnnotations({});
    setLastMoveFenPair(null);
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
    makeRandomBotMove(nextGame, playerColor, nextMode);
  }

  function changePlayerColor(nextColor) {
    const nextGame = new Chess();
    setAnalysisMode(false);
    setAnalysisGame(new Chess());
    setAnalysisMainline([]);
    setAnalysisPly(0);
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
    setMoveAnnotations({});
    setLastMoveFenPair(null);
    showStartNotice();
    setBoardKey((currentKey) => currentKey + 1);
    makeRandomBotMove(nextGame, nextColor, gameMode);
  }

  function canDragPiece({ piece }) {
    if ((!analysisMode && isBotThinking) || isGameOver(activeGame) || !piece?.pieceType) return false;

    const pieceColor = piece.pieceType[0];
    if (analysisMode) {
      return pieceColor === activeGame.turn();
    }
    if (gameMode === GAME_MODES.BOT) {
      return activeGame.turn() === playerColor && pieceColor === playerColor;
    }
    return pieceColor === activeGame.turn();
  }

  function showLegalMoveHints(eventOrSquare) {
    const square = resolveSquare(eventOrSquare);
    if (!square) return;

    const piece = activeGame.get(square);
    if (!piece || piece.color !== activeGame.turn() || (!analysisMode && isBotThinking) || isGameOver(activeGame)) {
      if (!selectedSquare) {
        setMoveHints({});
      }
      return;
    }
    if (!analysisMode && gameMode === GAME_MODES.BOT && piece.color !== playerColor) {
      if (!selectedSquare) {
        setMoveHints({});
      }
      return;
    }
    const moves = activeGame.moves({ square, verbose: true });
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

    if (!sourceSquare || !targetSquare || sourceSquare === targetSquare || (!analysisMode && isBotThinking) || isGameOver(activeGame)) return false;
    if (!analysisMode && gameMode === GAME_MODES.BOT && activeGame.turn() !== playerColor) return false;

    const beforeFen = activeGame.fen();
    const nextGame = cloneGame(activeGame);
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

    if (analysisMode) {
      setAnalysisGame(nextGame);
      setAnalysisPly(nextGame.history().length);
      return true;
    }

    const moveIndex = nextGame.history().length - 1;
    const playedUci = `${move.from}${move.to}${move.promotion || ''}`;
    setGame(nextGame);
    setMoveAnnotations((current) => ({
      ...current,
      [moveIndex]: { symbol: '...', label: 'Đang phân tích', tone: 'pending' },
    }));
    setLastMoveFenPair({
      beforeFen,
      afterFen: nextGame.fen(),
      playedUci,
      moveIndex,
      color: move.color,
      san: move.san,
    });
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

    const piece = activeGame.get(square);
    if (piece && piece.color === activeGame.turn()) {
      showLegalMoveHints(square);
      return;
    }

    clearSelection();
  }

  function undoMove() {
    if (analysisMode) {
      const nextGame = cloneGame(analysisGame);
      nextGame.undo();
      setAnalysisGame(nextGame);
      setAnalysisPly(nextGame.history().length);
      setEngineHint(null);
      setLastMoveSquares(getLastMoveSquares(nextGame));
      clearSelection();
      return nextGame;
    }

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
    setMoveAnnotations((current) => Object.fromEntries(
      Object.entries(current).filter(([index]) => Number(index) < nextGame.history().length)
    ));
    clearSelection();
    return nextGame;
  }

  function buildGameFromSanMoves(moves) {
    const replay = new Chess();
    moves.forEach((san) => {
      try {
        replay.move(san);
      } catch {
        // Ignore stale mainline entries if a library version formats SAN differently.
      }
    });
    return replay;
  }

  function enterAnalysisMode() {
    const mainline = game.history();
    const analysisCopy = cloneGame(game);
    setAnalysisMode(true);
    setAnalysisMainline(mainline);
    setAnalysisGame(analysisCopy);
    setAnalysisPly(mainline.length);
    setResultNotice(null);
    setIsBotThinking(false);
    setEngineHint(null);
    setMoveHints({});
    setSelectedSquare(null);
    setLastMoveSquares(getLastMoveSquares(analysisCopy));
  }

  function goToAnalysisPly(nextPly) {
    const boundedPly = Math.max(0, Math.min(nextPly, analysisMainline.length));
    const replay = buildGameFromSanMoves(analysisMainline.slice(0, boundedPly));
    setAnalysisGame(replay);
    setAnalysisPly(boundedPly);
    setEngineHint(null);
    setMoveHints({});
    setSelectedSquare(null);
    setLastMoveSquares(getLastMoveSquares(replay));
  }

  function exitAnalysisMode() {
    setAnalysisMode(false);
    setAnalysisGame(new Chess());
    setAnalysisMainline([]);
    setAnalysisPly(0);
    setEngineHint(null);
    setMoveHints({});
    setSelectedSquare(null);
    setLastMoveSquares(getLastMoveSquares(game));
  }

  return <div className="relative grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(350px,420px)] xl:grid-cols-[minmax(0,1fr)_minmax(390px,430px)]">
    {startNotice && <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 animate-[notice-pop_2.6s_ease-in-out_forwards] rounded-xl border border-amber-400/40 bg-slate-950/95 px-6 py-3 text-center font-black text-amber-300 shadow-glow backdrop-blur-xl">
      ♔ Bắt đầu ván cờ!
    </div>}
    {resultNotice && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="max-w-md rounded-2xl border border-amber-400/40 bg-slate-900/95 p-8 text-center shadow-glow">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-amber-500 text-4xl text-slate-950">♔</div>
        <h2 className="text-3xl font-black text-amber-300">Kết thúc ván đấu</h2>
        <p className="mt-4 text-xl font-bold text-slate-100">{resultNotice}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className="btn-primary" onClick={enterAnalysisMode}>Phân tích ván</button>
          <button className="btn-secondary" onClick={startNewGame}>Ván mới</button>
        </div>
      </div>
    </div>}

    <section className="panel-dark min-w-0 rounded-2xl p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400/75">Vua Cờ · Play</p>
          <h2 className="mt-1 text-xl font-black text-slate-50 md:text-2xl">Bàn cờ</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={status.label} tone={status.tone}/>
          <StatusBadge label={isBotThinking ? 'Bot đang nghĩ...' : getTurnLabel(activeGame)} tone="muted"/>
        </div>
      </div>

      {gameMode === GAME_MODES.BOT && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={coachAvatar} alt={`Avatar ${BOT_NAME}`} className="h-12 w-12 flex-none rounded-xl border border-amber-400/40 object-cover shadow-glow" />
            <div className="min-w-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-amber-400/70">Đối thủ</p>
              <h2 className="mt-0.5 truncate text-lg font-black text-slate-50">{BOT_NAME}</h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">Bạn {playerColorLabel}. Bot {botColorLabel}.</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-right">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">ELO đang đấu</p>
            <p className="text-2xl font-black text-amber-300">{selectedBotLevel.elo}</p>
            <p className="text-sm font-bold text-slate-400">{selectedBotLevel.description}</p>
          </div>
        </div>
      )}

      {analysisMode && (
        <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Analysis Mode</p>
              <p className="mt-1 text-sm font-semibold text-slate-300">Đang xem ply {analysisPly}/{analysisMainline.length}. Bạn có thể đi thử biến khác trên bàn cờ.</p>
            </div>
            <button className="btn-secondary px-3 py-2 text-sm" onClick={exitAnalysisMode}>Rời phân tích</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="btn-secondary px-3 py-2 text-sm" onClick={() => goToAnalysisPly(analysisPly - 1)} disabled={analysisPly <= 0}>Lùi</button>
            <button className="btn-secondary px-3 py-2 text-sm" onClick={() => goToAnalysisPly(analysisMainline.length)}>Về cuối</button>
            <button className="btn-secondary px-3 py-2 text-sm" onClick={() => goToAnalysisPly(analysisPly + 1)} disabled={analysisPly >= analysisMainline.length}>Tiến</button>
          </div>
        </div>
      )}

      {activeGame.isCheck() && (
        <div className="mx-auto mb-3 w-full max-w-[720px] rounded-2xl border border-red-500/45 bg-red-950/35 px-4 py-3 text-sm font-bold text-red-100">
          Vua {checkedColorLabel} đang bị chiếu. Phải cứu vua trước, các nước khác sẽ không hợp lệ.
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[700px] items-stretch justify-center gap-3">
        <LiveEvaluationBar analysis={liveAnalysis} status={liveEvalStatus} />
        <div className="min-w-0 flex-1">
          <div className="play-board-frame aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/70 p-2 shadow-[0_18px_48px_rgba(2,6,23,.32)] backdrop-blur box-border sm:p-3">
            <Chessboard key={boardKey} options={{
              pieces: standardPieces,
              position: activeFen,
              boardOrientation,
              onPieceDrop: onDrop,
              canDragPiece: canDragPiece,
              onPieceClick: showLegalMoveHints,
              onPieceDrag: showLegalMoveHints,
              onSquareClick: handleSquareClick,
              squareStyles: boardSquareStyles,
              arrows: engineArrows,
              boardStyle: fixedBoardStyle,
              squareStyle: stableSquareStyle,
              showNotation: true,
              showAnimations: true,
              animationDurationInMs: 190,
              darkSquareStyle: { backgroundColor: '#334155', ...stableSquareStyle },
              lightSquareStyle: { backgroundColor: '#94a3b8', ...stableSquareStyle },
              dropSquareStyle: { boxShadow: 'inset 0 0 0 3px rgba(245,158,11,.82)' },
              draggingPieceStyle: { filter: 'drop-shadow(0 20px 24px rgba(0,0,0,.5))', transform: 'scale(1.08)' },
              darkSquareNotationStyle: { color: 'rgba(248,250,252,.58)', fontWeight: 800 },
              lightSquareNotationStyle: { color: 'rgba(15,23,42,.58)', fontWeight: 800 },
            }} />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 grid w-full max-w-[720px] gap-3 text-sm">
        {engineMove ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-slate-100">
            <p>
              <b className="text-amber-300">Gợi ý engine:</b> {engineMove.pieceLabel} từ <b className="text-amber-300">{engineMove.from}</b> đến <b className="text-amber-300">{engineMove.to}</b>
              {engineMove.san && <span className="text-slate-400"> ({engineMove.san})</span>}
            </p>
            <button type="button" className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-black text-slate-300 hover:border-amber-400/60 hover:text-amber-300" onClick={() => setEngineHint(null)}>Ẩn</button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700 bg-slate-900/65 px-4 py-3 text-slate-400">
            {selectedPiece ? (
              <span>Đang chọn <b className="text-amber-300">{getPieceLabel(selectedPiece)}</b> ở <b className="text-amber-300">{selectedSquare}</b>: {selectedLegalMoves.length} nước hợp lệ đang sáng trên bàn.</span>
            ) : (
              <span>Chọn một quân để xem các ô có thể đi. Khi engine gợi ý, ô xuất phát và ô đích sẽ sáng trực tiếp trên bàn.</span>
            )}
          </div>
        )}
      </div>

    </section>

    <aside className="panel-dark min-w-0 rounded-2xl p-3 sm:p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
      <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400/75">Unified panel</p>
        <h2 className="mt-1 text-2xl font-black text-slate-50">Game Center</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Eval Bar, lịch sử nước đi và AI Coach được gom trong một cột.</p>
      </div>

      <div className="grid gap-4">
        <EngineAnalysisPanel
          fen={activeFen}
          onBestMove={setEngineHint}
          autoAnalyze={autoAnalyze}
          onAutoAnalyzeChange={setAutoAnalyze}
          autoComment={autoComment}
          review={review}
          isReviewing={isReviewing}
          onReview={reviewGameWithEngine}
        />

        <section className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400/75">Move list</p>
              <h2 className="mt-1 text-xl font-black text-slate-50">Lịch sử nước đi</h2>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">{history.length} nước</span>
          </div>
          <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-slate-700 bg-slate-950/45 p-3">
            {history.length ? <ol className="grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">{history.map((m,i)=>{
              const annotation = moveAnnotations[i];
              return (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/80 px-3 py-2">
                  <span className="min-w-0 truncate"><b className="text-amber-300">{i+1}.</b> {m}</span>
                  {annotation && (
                    <span title={annotation.label} className={`shrink-0 rounded-md border px-1.5 py-0.5 text-xs font-black ${annotationClassName(annotation.tone)}`}>
                      {annotation.symbol}
                    </span>
                  )}
                </li>
              );
            })}</ol> : <p className="text-sm text-slate-400">Chưa có nước đi nào.</p>}
          </div>
        </section>

        <AICoachPanel
          fen={activeFen}
          pgn={activePgn}
          history={history}
          stockfish={liveAnalysis ? {
            bestMove: liveAnalysis.bestMove,
            bestMoveSan: liveAnalysis.bestMove ? getSanFromUci(liveAnalysis.fen, liveAnalysis.bestMove) : null,
            evaluation: liveAnalysis.evaluation,
            pv: liveAnalysis.pv,
          } : null}
          turn={activeGame.turn()}
          status={status.label}
        />

        <section className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4 text-sm leading-6 text-slate-400">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500" htmlFor="game-mode">Chế độ chơi</label>
          <div className="mt-3 grid gap-3">
            <select id="game-mode" value={gameMode} onChange={(event) => changeGameMode(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-slate-100 outline-none transition focus:border-amber-400">
              <option value={GAME_MODES.LOCAL}>2 người chơi</option>
              <option value={GAME_MODES.BOT}>Đấu với {BOT_NAME}</option>
            </select>
            {gameMode === GAME_MODES.BOT && <select id="player-color" value={playerColor} onChange={(event) => changePlayerColor(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-slate-100 outline-none transition focus:border-amber-400">
              <option value={PLAYER_COLORS.WHITE}>Bạn cầm trắng</option>
              <option value={PLAYER_COLORS.BLACK}>Bạn cầm đen</option>
            </select>}
            {gameMode === GAME_MODES.BOT && <select id="bot-elo" value={botElo} onChange={(event) => {
              setBotElo(Number(event.target.value));
            }} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-slate-100 outline-none transition focus:border-amber-400">
              {BOT_ELO_LEVELS.map((level) => <option key={level.elo} value={level.elo}>{level.label} - {level.description}</option>)}
            </select>}
          </div>
          {gameMode === GAME_MODES.BOT && (
            <div className="mt-3 space-y-2">
              <p>Bạn cầm quân {playerColorLabel}. <strong className="text-slate-200">{BOT_NAME}</strong> ở mức <strong className="text-amber-300">{selectedBotLevel.label}</strong> sẽ tự đi sau mỗi nước hợp lệ của bạn.</p>
              {botMoveSource && (
                <p className="text-xs">
                  {botMoveSource === 'stockfish_wasm' && <span className="text-amber-300">✓ Engine: Stockfish WASM</span>}
                  {botMoveSource === 'random_weak' && <span className="text-amber-300">○ Bot chơi yếu (ELO thấp)</span>}
                  {botMoveSource === 'fallback' && <span className="text-red-300">⚠ Engine: Fallback cơ bản (Stockfish không khả dụng)</span>}
                </p>
              )}
              {isBotThinking && <p className="text-xs text-slate-400">{BOT_NAME} đang suy nghĩ...</p>}
            </div>
          )}
          {gameMode === GAME_MODES.LOCAL && <p className="mt-3">Hai người chơi lần lượt trên cùng một thiết bị.</p>}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn-primary w-full justify-center" onClick={startNewGame}>Ván mới</button>
            <button className="btn-secondary w-full justify-center" onClick={undoMove}>Hoàn tác</button>
          </div>
        </section>
      </div>
    </aside>
  </div>;
}
