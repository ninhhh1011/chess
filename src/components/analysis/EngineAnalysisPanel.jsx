import { useEffect, useState } from 'react';
import { analyzeFen, isEngineReady, stopEngine } from '../../services/stockfishService';
import { formatEvaluation, getSanFromUci } from '../../utils/chessMoveUtils';
import GameReviewPanel from './GameReviewPanel';
import { BRAND_NAMES, UI_COPY } from '../../config/brand';
import { AppButton } from '../../ui';

function getEvalPercent(evaluation) {
  if (!evaluation) return 50;
  if (evaluation.type === 'mate') return evaluation.value > 0 ? 96 : 4;

  const pawns = (Number(evaluation.value) || 0) / 100;
  return Math.max(4, Math.min(96, 50 + Math.tanh(pawns / 4) * 44));
}

/**
 * EngineAnalysisPanel - Option C styling
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
        setError(`${UI_COPY.hint}: ${getSanFromUci(result.fen, result.bestMove)}`);
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--app-foreground)]">{BRAND_NAMES.analysis}</h3>
        <span className="rounded px-2 py-0.5 text-xs font-medium bg-[var(--app-accent-soft)] text-[var(--app-accent)] border border-[var(--app-accent)]/20">
          {status}
        </span>
      </div>

      {/* Single source disclosure line per Section 14 */}
      <p className="text-[11px] text-[var(--app-subtle)]">
        Nguồn: Stockfish 18 · Diễn giải cơ bản
      </p>

      {/* Evaluation bar + info */}
      <div className="grid grid-cols-[0.875rem_1fr] gap-2.5">
        {/* Vertical eval bar */}
        <div className="relative h-28 overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)]">
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#DAD2BD] transition-all duration-300"
            style={{ height: `${whiteEvalPercent}%` }}
          />
          <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--app-copper)]/80" />
        </div>

        {/* Eval info */}
        <div className="space-y-2">
          <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--app-muted)]">Đánh giá</span>
              <b className="font-mono text-[var(--app-accent)]">{formatEvaluation(analysis?.evaluation)}</b>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--app-surface-raised)]">
              <div
                className="h-full bg-[var(--app-accent)] transition-all duration-300"
                style={{ width: `${whiteEvalPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-xs text-[var(--app-foreground)]">
            <span className="text-[var(--app-muted)]">Nước tốt nhất: </span>
            <b className="font-mono text-[var(--app-copper)]">{bestSan || '—'}</b>
          </div>
        </div>
      </div>

      {/* Auto analyze */}
      <label className="flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-xs font-medium text-[var(--app-foreground)] cursor-pointer">
        <input
          type="checkbox"
          checked={autoAnalyze}
          onChange={(e) => onAutoAnalyzeChange(e.target.checked)}
          className="accent-[var(--app-accent)] rounded"
        />
        Tự động phân tích
      </label>

      {/* Comments */}
      {autoComment && (
        <p className="rounded-md border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-2 text-xs text-[var(--app-accent-hover)]">
          {autoComment}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-[var(--app-copper)]/30 bg-[var(--app-copper-soft)] p-2 text-xs text-[var(--app-copper)]">
          {error}
        </p>
      )}

      {/* PV */}
      <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2 text-xs text-[var(--app-muted)]">
        <span className="font-semibold text-[var(--app-foreground)]">PV: </span>
        <span className="font-mono text-[11px]">
          {analysis?.pv?.map((uci) => getSanFromUci(analysis.fen, uci)).join(' ') || '—'}
        </span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <AppButton size="sm" variant="primary" onClick={() => runAnalysis(false)} disabled={isAnalyzing}>
          {isAnalyzing ? 'Đang mổ...' : BRAND_NAMES.analysis}
        </AppButton>
        <AppButton size="sm" variant="secondary" onClick={() => runAnalysis(true)} disabled={isAnalyzing}>
          {UI_COPY.hint}
        </AppButton>
      </div>
      <AppButton size="sm" variant="ghost" className="w-full" onClick={handleStop}>
        Dừng
      </AppButton>

      {/* Game review */}
      <div className="pt-2">
        <GameReviewPanel review={review} isReviewing={isReviewing} onReview={onReview} />
      </div>
    </div>
  );
}
