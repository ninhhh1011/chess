import { useEffect, useRef, useState } from 'react';
import { useChessGame } from '../contexts/ChessGameContext';
import { useBotMove } from '../hooks/useBotMove';
import { useEngineAnalysis } from '../hooks/useEngineAnalysis';
import { analyzeFen } from '../services/stockfishService';
import { getSanFromUci, classifyMoveLoss } from '../utils/chessMoveUtils';
import { addMistake, updateAfterGame } from '../services/userProfileService';
import { playCheckSound } from '../utils/sound';

import ChessBoardPanel from './chess/ChessBoardPanel';
import GameStatusBanner from './chess/GameStatusBanner';
import BotInfoPanel from './chess/BotInfoPanel';
import AnalysisControls from './chess/AnalysisControls';
import CheckWarning from './chess/CheckWarning';
import LiveEvaluationBar from './chess/LiveEvaluationBar';
import MoveHintDisplay from './chess/MoveHintDisplay';
import StartNotice from './chess/StartNotice';
import ResultModal from './chess/ResultModal';
import PromotionModal from './chess/PromotionModal';
import MoveHistory from './chess/MoveHistory';
import BotSettings from './chess/BotSettings';
import GameControls from './chess/GameControls';
import EngineAnalysisPanel from './analysis/EngineAnalysisPanel';
import AICoachPanel from './AICoachPanel';

function evaluationForColor(analysis, color) {
  if (!analysis?.evaluation) return 0;
  const whitePawns =
    analysis.evaluation.type === 'mate'
      ? analysis.evaluation.value > 0
        ? 99
        : -99
      : (Number(analysis.evaluation.value) || 0) / 100;
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

export default function ChessGameBoard() {
  const {
    game,
    activeGame,
    currentFen,
    currentPgn,
    moveHistory,
    isCheck,
    isGameOver,
    analysisMode,
    isBotThinking,
    engineHint,
    setEngineHint,
    lastMoveFenPair,
    setLastMoveFenPair,
    moveAnnotations,
    setMoveAnnotations,
    resultNotice,
    setResultNotice,
    recordedGamePgn,
    setRecordedGamePgn,
  } = useChessGame();

  const { triggerBotMove } = useBotMove();

  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [autoComment, setAutoComment] = useState('');
  const [review, setReview] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [liveEvalStatus, setLiveEvalStatus] = useState('Đang tải');
  const [showStartNotice, setShowStartNotice] = useState(true);

  const liveAnalysisRequestRef = useRef(0);
  const lastCheckFenRef = useRef(null);

  // Check sound effect
  useEffect(() => {
    if (!isCheck) {
      lastCheckFenRef.current = null;
      return;
    }

    const currentCheckFen = currentFen;
    if (lastCheckFenRef.current === currentCheckFen) return;

    lastCheckFenRef.current = currentCheckFen;
    playCheckSound();
  }, [isCheck, currentFen]);

  // Live analysis
  useEffect(() => {
    if (!analysisMode && isBotThinking) {
      setLiveEvalStatus('Bot đang nghĩ');
      return undefined;
    }

    const requestId = liveAnalysisRequestRef.current + 1;
    liveAnalysisRequestRef.current = requestId;
    setLiveEvalStatus('Đang phân tích');

    const timerId = window.setTimeout(() => {
      analyzeFen({ fen: currentFen, depth: 8, movetime: 650 })
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
  }, [currentFen, analysisMode, isBotThinking]);

  // Game over handling
  useEffect(() => {
    if (!isGameOver) {
      setResultNotice(null);
      return;
    }

    const currentPgn = game.pgn();
    if (recordedGamePgn !== currentPgn) {
      const result = game.isCheckmate() ? (game.turn() === 'w' ? 'black_win' : 'white_win') : 'draw';
      const mistakes = moveHistory.length < 12 ? ['opening_development'] : [];
      updateAfterGame({ result, movesCount: moveHistory.length, mistakes });
      setRecordedGamePgn(currentPgn);
    }

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Đen' : 'Trắng';
      setResultNotice(`${winner} thắng bằng chiếu hết!`);
      return;
    }

    setResultNotice('Ván cờ hòa!');
  }, [isGameOver, game, recordedGamePgn, moveHistory.length, setResultNotice, setRecordedGamePgn]);

  // Move annotation
  useEffect(() => {
    if (!lastMoveFenPair) return;
    let cancelled = false;

    async function analyzeLastMove() {
      try {
        const before = await analyzeFen({ fen: lastMoveFenPair.beforeFen, depth: 8, movetime: 650 });
        if (cancelled) return;
        const after = await analyzeFen({ fen: lastMoveFenPair.afterFen, depth: 7, movetime: 550 });
        if (cancelled) return;

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

        const bestSan = before.bestMove ? getSanFromUci(lastMoveFenPair.beforeFen, before.bestMove) : 'không rõ';
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
    return () => {
      cancelled = true;
    };
  }, [lastMoveFenPair, autoAnalyze, setMoveAnnotations]);

  // Game review
  async function reviewGameWithEngine() {
    const moves = game.history({ verbose: true }).slice(-12);
    if (!moves.length) return;

    setIsReviewing(true);
    const replay = new (await import('chess.js')).Chess();
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
      results.forEach((item) => {
        counts[item.classification.type] = (counts[item.classification.type] || 0) + 1;
      });
      const worstMoves = results.filter((item) => item.classification.type !== 'good').slice(-3);

      if (counts.blunder) addMistake('engine_blunder');
      if (counts.mistake || counts.inaccuracy) addMistake('engine_mistake');

      setReview({ total: results.length, counts, worstMoves });
    } finally {
      setIsReviewing(false);
    }
  }

  // Parse engine move for display
  function parseEngineMove(hint) {
    if (!hint?.bestMove || !hint?.fen) return null;
    const uci = hint.bestMove;
    if (uci.length < 4) return null;

    return {
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : '',
      san: getSanFromUci(hint.fen, uci),
    };
  }

  const engineMove = parseEngineMove(engineHint);

  return (
    <div className="relative grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
      {showStartNotice && <StartNotice />}
      <ResultModal />
      <PromotionModal />

      <section className="panel-dark min-w-0 rounded-2xl p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400/75">Vua Cờ · Play</p>
            <h2 className="mt-1 text-xl font-black text-slate-50 md:text-2xl">Bàn cờ</h2>
          </div>
          <GameStatusBanner />
        </div>

        <BotInfoPanel />
        <AnalysisControls />
        <CheckWarning />

        <div className="mx-auto flex w-full items-stretch justify-center gap-3">
          <LiveEvaluationBar analysis={liveAnalysis} status={liveEvalStatus} />
          <div className="min-w-0 flex-1">
            <ChessBoardPanel engineHint={engineHint} />
          </div>
        </div>

        <div className="mx-auto mt-4 grid w-full gap-3 text-sm">
          <MoveHintDisplay engineMove={engineMove} />
        </div>
      </section>

      <aside className="panel-dark min-w-0 rounded-2xl p-3 sm:p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400/75">Trận đấu</p>
          <h2 className="mt-1 text-2xl font-black text-slate-50">Điều khiển</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Phân tích, lịch sử nước đi và AI Coach trong một cột.
          </p>
        </div>

        <div className="grid gap-4">
          <EngineAnalysisPanel
            fen={currentFen}
            onBestMove={setEngineHint}
            autoAnalyze={autoAnalyze}
            onAutoAnalyzeChange={setAutoAnalyze}
            autoComment={autoComment}
            review={review}
            isReviewing={isReviewing}
            onReview={reviewGameWithEngine}
          />

          <MoveHistory />

          <AICoachPanel
            fen={currentFen}
            pgn={currentPgn}
            history={moveHistory}
            stockfish={
              liveAnalysis
                ? {
                    bestMove: liveAnalysis.bestMove,
                    bestMoveSan: liveAnalysis.bestMove ? getSanFromUci(liveAnalysis.fen, liveAnalysis.bestMove) : null,
                    evaluation: liveAnalysis.evaluation,
                    pv: liveAnalysis.pv,
                  }
                : null
            }
            turn={activeGame.turn()}
            status={isGameOver ? 'Game Over' : isCheck ? 'Check' : 'Playing'}
          />

          <BotSettings />
          <GameControls />
        </div>
      </aside>
    </div>
  );
}
