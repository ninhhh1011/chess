import { useEffect, useState } from 'react';
import { analyzeFen, isEngineReady, stopEngine } from '../../services/stockfishService';
import { formatEvaluation, getSanFromUci } from '../../utils/chessMoveUtils';
import GameReviewPanel from './GameReviewPanel';

function getEvalPercent(evaluation) {
  if (!evaluation) return 50;
  if (evaluation.type === 'mate') return evaluation.value > 0 ? 96 : 4;

  const pawns = (Number(evaluation.value) || 0) / 100;
  return Math.max(4, Math.min(96, 50 + Math.tanh(pawns / 4) * 44));
}

export default function EngineAnalysisPanel({ fen, onBestMove, onReview, review, isReviewing, autoAnalyze, onAutoAnalyzeChange, autoComment }) {
  const [status, setStatus] = useState(() => (isEngineReady() ? 'Sẵn sàng' : 'Chưa tải'));
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const bestSan = analysis?.bestMove ? getSanFromUci(analysis.fen, analysis.bestMove) : null;
  const bestRoute = analysis?.bestMove ? `${analysis.bestMove.slice(0, 2)} -> ${analysis.bestMove.slice(2, 4)}` : null;
  const whiteEvalPercent = getEvalPercent(analysis?.evaluation);

  useEffect(() => {
    setAnalysis(null);
    setError('');
  }, [fen]);

  async function runAnalysis(showHint = false) {
    setIsAnalyzing(true);
    setError('');
    setStatus(isEngineReady() ? 'Đang phân tích' : 'Đang tải engine');

    try {
      const result = await analyzeFen({ fen, depth: 10 });
      setAnalysis(result);
      setStatus(result.source === 'fallback' ? 'Fallback' : 'Sẵn sàng');
      if (result.bestMove) {
        onBestMove?.({ bestMove: result.bestMove, fen: result.fen, evaluation: result.evaluation });
      }
      if (showHint && result.bestMove) {
        setError(`Engine gợi ý: ${result.bestMove.slice(0, 2)} -> ${result.bestMove.slice(2, 4)} (${getSanFromUci(result.fen, result.bestMove)})`);
      }
    } catch (err) {
      setStatus('Lỗi');
      setError(err.message || 'Engine chưa sẵn sàng, vui lòng thử lại.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleStop() {
    stopEngine();
    setIsAnalyzing(false);
    setStatus('Đã dừng');
  }

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400/80">Eval Bar</p>
          <h2 className="mt-1 text-xl font-black text-slate-50">Stockfish</h2>
        </div>
        <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-black text-amber-300">{status}</span>
      </div>

      <div className="mt-4 grid grid-cols-[1.1rem_1fr] gap-3">
        <div className="relative overflow-hidden rounded-full border border-slate-600 bg-slate-950">
          <div className="absolute bottom-0 left-0 right-0 bg-slate-50 transition-all duration-300" style={{ height: `${whiteEvalPercent}%` }} />
          <div className="absolute inset-x-0 top-1/2 h-px bg-amber-400/60" />
        </div>
        <div className="grid gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Evaluation</span>
              <b className="text-amber-300">{formatEvaluation(analysis?.evaluation)}</b>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${whiteEvalPercent}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
              <span>Black</span>
              <span>White</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm text-slate-300">
            <p>Best move: <b className="text-amber-300">{bestSan || 'Chưa có'}</b></p>
            <p className="mt-1">Route: <b className="text-amber-300">{bestRoute || 'Chưa có'}</b></p>
          </div>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-sm font-bold text-slate-300">
        <input type="checkbox" checked={autoAnalyze} onChange={(event) => onAutoAnalyzeChange(event.target.checked)} />
        Tự phân tích sau mỗi nước
      </label>

      {autoComment && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm font-bold text-amber-200">{autoComment}</p>}
      <p className="mt-3 rounded-xl border border-slate-700 bg-slate-950/45 p-3 text-xs leading-5 text-slate-400">
        PV: <span className="text-slate-300">{analysis?.pv?.map((uci) => getSanFromUci(analysis.fen, uci)).join(' ') || 'Chưa có'}</span>
      </p>
      {error && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm font-bold text-amber-200">{error}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className="btn-primary min-h-11 px-3 py-2 text-sm" onClick={() => runAnalysis(false)} disabled={isAnalyzing}>{isAnalyzing ? 'Đang phân tích...' : 'Phân tích'}</button>
        <button className="btn-secondary min-h-11 px-3 py-2 text-sm" onClick={() => runAnalysis(true)} disabled={isAnalyzing}>Gợi ý</button>
        <button className="btn-secondary min-h-11 px-3 py-2 text-sm sm:col-span-2" onClick={handleStop}>Dừng phân tích</button>
      </div>

      <div className="mt-4">
        <GameReviewPanel review={review} isReviewing={isReviewing} onReview={onReview} />
      </div>
    </section>
  );
}
