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
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-red-400">Analysis Error</h3>
            <p className="mt-2 text-sm text-slate-300">{error}</p>
          </div>
          <button className="btn-secondary" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-6">
        <h3 className="text-lg font-bold text-primary-400">Analyzing Game...</h3>

        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-400">
              <span>{progress.message}</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-700">
              <div
                className="h-2 rounded-full bg-primary-500 transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            {progress.currentPly > 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Move {progress.currentPly} / {progress.totalPlies}
              </p>
            )}
          </div>
        )}

        <button className="btn-secondary mt-4" onClick={onCancel}>
          Cancel
        </button>
      </div>
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
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-400">
              Game Analysis
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {analysis.summary.mistakesCount} mistakes, {analysis.summary.blundersCount} blunders
            </p>
          </div>
          <div className="text-right text-sm text-slate-400">
            <p>{analysis.engine.source}</p>
            {analysis.engine.depth && <p>Depth: {analysis.engine.depth}</p>}
          </div>
        </div>

        {analysis.summary.avgCPL !== null && (
          <p className="mt-2 text-sm text-slate-400">
            Average centipawn loss: {analysis.summary.avgCPL}
          </p>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Analysis completed in {(analysis.durationMs / 1000).toFixed(1)}s
        </p>
      </div>

      {/* Top Mistakes */}
      {topMistakes.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            Top Turning Points
          </h4>

          <ul className="space-y-2">
            {topMistakes.map((fact, i) => (
              <li key={fact.ply}>
                <button
                  onClick={() => handleMistakeClick(fact)}
                  className={`w-full rounded-lg p-3 text-left transition-colors ${
                    selectedMistake?.ply === fact.ply
                      ? 'bg-primary-500/20 border border-primary-500/50'
                      : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      Move {fact.ply}: {fact.playedMove.san}
                    </span>
                    <span className={`text-xs font-bold ${
                      fact.classification === 'blunder' ? 'text-red-400' :
                      fact.classification === 'mistake' ? 'text-orange-400' :
                      'text-yellow-400'
                    }`}>
                      {fact.classification.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Best: {fact.bestMove.san || 'N/A'}</span>
                    {fact.centipawnLoss !== null && (
                      <span>CPL: {fact.centipawnLoss}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Selected Mistake Detail */}
      {selectedMistake && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white">
              Move {selectedMistake.ply} Detail
            </h4>
            <button
              onClick={() => onSendToCoach(selectedMistake)}
              className="btn-primary text-sm"
            >
              Ask Coach
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Played</p>
              <p className="font-mono text-lg text-white">{selectedMistake.playedMove.san}</p>
            </div>
            <div>
              <p className="text-slate-500">Best</p>
              <p className="font-mono text-lg text-emerald-400">{selectedMistake.bestMove.san || 'N/A'}</p>
            </div>
          </div>

          {selectedMistake.centipawnLoss !== null && (
            <div className="mt-3 rounded bg-slate-700/50 p-3">
              <p className="text-sm text-slate-400">
                Centipawn Loss: <span className="font-mono text-white">{selectedMistake.centipawnLoss}</span>
              </p>
              <p className="text-sm text-slate-400">
                Classification: <span className={`font-bold ${
                  selectedMistake.classification === 'blunder' ? 'text-red-400' :
                  selectedMistake.classification === 'mistake' ? 'text-orange-400' :
                  'text-yellow-400'
                }`}>{selectedMistake.classification}</span>
              </p>
            </div>
          )}

          {selectedMistake.skillTags.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-slate-500">Tags:</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {selectedMistake.skillTags.map(tag => (
                  <span key={tag} className="rounded bg-slate-600 px-2 py-1 text-xs text-slate-300">
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Candidates */}
          {selectedMistake.candidates.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-slate-500">Top Alternatives:</p>
              <ul className="mt-1 space-y-1">
                {selectedMistake.candidates.slice(0, 3).map((cand, i) => (
                  <li key={i} className="text-sm text-slate-300">
                    <span className="font-mono">{cand.san}</span>
                    {cand.eval && (
                      <span className="ml-2 text-xs text-slate-500">
                        {cand.eval.type === 'cp' ? `cp: ${cand.eval.value}` : `mate: ${cand.eval.value}`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Engine Info */}
          <div className="mt-3 border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-500">
              Engine: {selectedMistake.engine.source}
              {selectedMistake.engine.version !== 'unknown' && ` v${selectedMistake.engine.version}`}
              {selectedMistake.engine.depth && ` @ depth ${selectedMistake.engine.depth}`}
              {selectedMistake.engine.movetimeMs && ` in ${selectedMistake.engine.movetimeMs}ms`}
            </p>
          </div>
        </div>
      )}

      {topMistakes.length === 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <p className="text-lg font-bold text-emerald-400">Great Game!</p>
          <p className="mt-2 text-slate-400">No significant mistakes detected.</p>
        </div>
      )}
    </div>
  );
}
