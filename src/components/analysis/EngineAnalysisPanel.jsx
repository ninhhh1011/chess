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

/**
 * EngineAnalysisPanel - Refactored gọn gàng
 * Bỏ header lớn, giảm padding, tối ưu layout
 */
export default function EngineAnalysisPanel({ fen, onBestMove, onReview, review, isReviewing, autoAnalyze, onAutoAnalyzeChange, autoComment }) {
  const [status, setStatus] = useState(() => (isEngineReady() ? 'Sẵn sàng' : 'Chưa tải'));
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const bestSan = analysis?.bestMove ? getSanFromUci(analysis.fen, analysis.bestMove) : null;
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
      const result = await analyzeFen({ fen, depth: 10, purpose: showHint ? 'hint' : 'review' });
      setAnalysis(result);
      setStatus(result.source?.startsWith('fallback') ? 'Fallback' : 'Sẵn sàng');
      if (result.bestMove) {
        onBestMove?.({ bestMove: result.bestMove, fen: result.fen, evaluation: result.evaluation });
      }
      if (showHint && result.bestMove) {
        setError(`Gợi ý: ${getSanFromUci(result.fen, result.bestMove)}`);
      }
    } catch (err) {
      setStatus('Lỗi');
      setError(err.message || 'Engine chưa sẵn sàng');
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
    <div>
      {/* Header gọn */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300">Stockfish</h3>
        <span className="rounded bg-slate-700/60 px-2 py-1 text-xs font-bold text-emerald-300">{status}</span>
      </div>

      {/* Evaluation bar + info */}
      <div className="mb-3 grid grid-cols-[1rem_1fr] gap-2">
        {/* Vertical eval bar */}
        <div className="relative h-32 overflow-hidden rounded-full border border-slate-600/60 bg-slate-950/50">
          <div className="absolute bottom-0 left-0 right-0 bg-slate-50 transition-all duration-300" style={{ height: `${whiteEvalPercent}%` }} />
          <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-400/60" />
        </div>

        {/* Eval info */}
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Đánh giá</span>
              <b className="text-emerald-300">{formatEvaluation(analysis?.evaluation)}</b>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-700/60">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${whiteEvalPercent}%` }} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-2 text-xs text-slate-300">
            <p>Nước tốt nhất: <b className="text-emerald-300">{bestSan || '—'}</b></p>
          </div>
        </div>
      </div>

      {/* Auto analyze */}
      <label className="mb-3 flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 p-2 text-xs font-bold text-slate-300 cursor-pointer">
        <input type="checkbox" checked={autoAnalyze} onChange={(e) => onAutoAnalyzeChange(e.target.checked)} className="rounded" />
        Tự động phân tích
      </label>

      {/* Comments */}
      {autoComment && <p className="mb-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2 text-xs font-bold text-emerald-200">{autoComment}</p>}
      {error && <p className="mb-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2 text-xs font-bold text-emerald-200">{error}</p>}

      {/* PV */}
      <p className="mb-3 rounded-lg border border-slate-700/60 bg-slate-950/30 p-2 text-xs leading-relaxed text-slate-400">
        <span className="text-slate-500">PV:</span> <span className="text-slate-300">{analysis?.pv?.map((uci) => getSanFromUci(analysis.fen, uci)).join(' ') || '—'}</span>
      </p>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button className="btn-primary px-3 py-2 text-xs" onClick={() => runAnalysis(false)} disabled={isAnalyzing}>
          {isAnalyzing ? 'Đang phân tích...' : 'Phân tích'}
        </button>
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => runAnalysis(true)} disabled={isAnalyzing}>
          Gợi ý
        </button>
      </div>
      <button className="btn-secondary w-full px-3 py-2 text-xs" onClick={handleStop}>Dừng</button>

      {/* Game review */}
      <div className="mt-3">
        <GameReviewPanel review={review} isReviewing={isReviewing} onReview={onReview} />
      </div>
    </div>
  );
}
