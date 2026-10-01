/**
 * Post-Game Review Component
 *
 * Shows analysis results after a game:
 * - Progress indicator
 * - Top mistakes list
 * - Mistake detail with board
 * - Coach integration
 */

import { useState } from 'react';
import { Chess } from 'chess.js';
import type { GameAnalysis, AnalysisFactV1, AnalysisProgress } from '../../types/analysis';
import type { ReviewItem } from '../../types/analysis';
import { AppButton, AppProgress, AppStatus, AppSurface } from '../../ui';

interface PostGameReviewProps {
  analysis: GameAnalysis | null;
  progress: AnalysisProgress | null;
  isAnalyzing: boolean;
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onMistakeClick: (ply: number) => void;
  onSendToCoach: (fact: AnalysisFactV1) => void;
}

export default function PostGameReview({
  analysis,
  progress,
  isAnalyzing,
  error,
  onCancel,
  onRetry,
  onMistakeClick,
  onSendToCoach,
}: PostGameReviewProps) {
  const [selectedMistake, setSelectedMistake] = useState<AnalysisFactV1 | null>(null);

  if (error) {
    return (
      <AppSurface className="p-6 border border-red-500/30 bg-red-500/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-red-400">Analysis Error</h3>
            <p className="mt-2 text-sm text-slate-300">{error}</p>
          </div>
          <AppButton variant="secondary" onClick={onRetry}>
            Thử lại
          </AppButton>
        </div>
      </AppSurface>
    );
  }

  if (isAnalyzing) {
    return (
      <AppSurface className="p-6 border border-[var(--app-border)]">
        <h3 className="text-lg font-bold text-[var(--app-foreground)]">Đang phân tích ván đấu...</h3>

        {progress && (
          <div className="mt-4 space-y-2">
            <AppProgress
              value={progress.percentage}
              label={progress.message}
              valueLabel={`${progress.percentage}%`}
            />
            {progress.currentPly > 0 && (
              <p className="text-xs text-[var(--app-muted)]">
                Nước {progress.currentPly} / {progress.totalPlies}
              </p>
            )}
          </div>
        )}

        <AppButton variant="secondary" className="mt-4" onClick={onCancel}>
          Hủy
        </AppButton>
      </AppSurface>
    );
  }

  if (!analysis) {
    return null;
  }

  const handleMistakeClick = (fact: AnalysisFactV1) => {
    setSelectedMistake(fact);
    onMistakeClick(fact.ply);
  };

  const topMistakes = analysis.analysis.filter(f =>
    ['mistake', 'blunder', 'inaccuracy'].includes(f.classification)
  ).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <AppSurface className="p-4 border border-[var(--app-border)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--app-accent)]">
              Phân tích ván đấu
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--app-foreground)]">
              {analysis.summary.mistakesCount} nước lỗi, {analysis.summary.blundersCount} sai lầm lớn
            </p>
          </div>
          <div className="text-right text-xs text-[var(--app-muted)]">
            <p>{analysis.engine.source}</p>
            {analysis.engine.depth && <p>Độ sâu: {analysis.engine.depth}</p>}
          </div>
        </div>

        {analysis.summary.avgCPL !== null && (
          <p className="mt-2 text-xs text-[var(--app-muted)]">
            Tổn thất centipawn trung bình: {analysis.summary.avgCPL}
          </p>
        )}

        <p className="mt-2 text-[11px] text-[var(--app-subtle)]">
          Hoàn thành phân tích trong {(analysis.durationMs / 1000).toFixed(1)} giây
        </p>
      </AppSurface>

      {/* Top Mistakes */}
      {topMistakes.length > 0 && (
        <AppSurface className="p-4 border border-[var(--app-border)]">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
            Các điểm ngoặt của ván đấu
          </h4>

          <ul className="space-y-2">
            {topMistakes.map((fact) => (
              <li key={fact.ply}>
                <button
                  type="button"
                  onClick={() => handleMistakeClick(fact)}
                  className={`w-full rounded-[8px] p-3 text-left transition-colors cursor-pointer ${
                    selectedMistake?.ply === fact.ply
                      ? 'bg-[var(--app-accent)]/15 border border-[var(--app-accent)]'
                      : 'bg-[var(--app-surface-raised)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--app-foreground)]">
                      Nước {fact.ply}: {fact.playedMove.san}
                    </span>
                    <AppStatus
                      variant={
                        fact.classification === 'blunder' ? 'danger' :
                        fact.classification === 'mistake' ? 'warning' : 'basic'
                      }
                      size="sm"
                    >
                      {fact.classification.toUpperCase()}
                    </AppStatus>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-[var(--app-muted)]">
                    <span>Nước tối ưu: {fact.bestMove.san || 'N/A'}</span>
                    {fact.centipawnLoss !== null && (
                      <span>CPL: {fact.centipawnLoss}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </AppSurface>
      )}

      {/* Selected Mistake Detail */}
      {selectedMistake && (
        <AppSurface className="p-4 border border-[var(--app-border)]">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-[var(--app-foreground)]">
              Chi tiết nước {selectedMistake.ply}
            </h4>
            <AppButton
              size="sm"
              variant="primary"
              onClick={() => onSendToCoach(selectedMistake)}
            >
              Hỏi Coach
            </AppButton>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[var(--app-muted)]">Đã đi</p>
              <p className="font-mono text-base font-bold text-[var(--app-foreground)]">{selectedMistake.playedMove.san}</p>
            </div>
            <div>
              <p className="text-[var(--app-muted)]">Tối ưu</p>
              <p className="font-mono text-base font-bold text-[var(--app-accent)]">{selectedMistake.bestMove.san || 'N/A'}</p>
            </div>
          </div>

          {selectedMistake.centipawnLoss !== null && (
            <div className="mt-3 rounded-[6px] bg-[var(--app-surface)] p-2.5 border border-[var(--app-border)]">
              <p className="text-xs text-[var(--app-muted)]">
                Tổn thất centipawn: <span className="font-mono text-[var(--app-foreground)] font-bold">{selectedMistake.centipawnLoss}</span>
              </p>
            </div>
          )}

          {selectedMistake.skillTags.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-[var(--app-muted)]">Chủ đề:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {selectedMistake.skillTags.map(tag => (
                  <AppStatus key={tag} variant="basic" size="sm">
                    {tag.replace(/_/g, ' ')}
                  </AppStatus>
                ))}
              </div>
            </div>
          )}

          {/* Engine Info */}
          <div className="mt-3 border-t border-[var(--app-border)] pt-2.5">
            <p className="text-[11px] text-[var(--app-subtle)]">
              Engine: {selectedMistake.engine.source}
              {selectedMistake.engine.version !== 'unknown' && ` v${selectedMistake.engine.version}`}
              {selectedMistake.engine.depth && ` @ depth ${selectedMistake.engine.depth}`}
            </p>
          </div>
        </AppSurface>
      )}

      {topMistakes.length === 0 && (
        <AppSurface className="p-6 text-center border border-[var(--app-border)]">
          <p className="text-base font-bold text-[var(--app-accent)]">Ván cờ tuyệt vời!</p>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Không ghi nhận sai lầm nghiêm trọng nào.</p>
        </AppSurface>
      )}
    </div>
  );
}
