/**
 * Phase 1 Coach - Engine-Backed
 *
 * Coach interprets from AnalysisFactV1 data only.
 * Does NOT invent moves, evals, or opening names.
 */

import { useState } from 'react';
import type { AnalysisFactV1, CoachResponse } from '../../types/analysis';
import { generateCoachExplanation } from '../../services/analysis/coach';

interface AnalysisCoachProps {
  facts: AnalysisFactV1[];
  topMistakes: string[];
  playerSide: 'w' | 'b';
  focusedPly?: number;
  focusedFact?: AnalysisFactV1 | null;
}

export default function AnalysisCoach({
  facts,
  topMistakes,
  playerSide,
  focusedPly,
  focusedFact,
}: AnalysisCoachProps) {
  const [coachResponse, setCoachResponse] = useState<CoachResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAskCoach = async () => {
    setIsLoading(true);

    try {
      // Build context from analysis facts
      const context = {
        facts,
        topMistakes,
        playerSide,
        moveContext: focusedFact ? {
          played: focusedFact.playedMove.san,
          best: focusedFact.bestMove.san,
          ply: focusedFact.ply,
          fen: focusedFact.fenAfter,
        } : undefined,
      };

      const response = generateCoachExplanation(context);
      setCoachResponse(response);
    } catch (error) {
      console.error('[coach] Error:', error);
      setCoachResponse({
        reply: 'Không thể tạo gợi ý lúc này.',
        suggestions: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!facts || facts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <p className="text-sm text-slate-400">
          Chưa có dữ liệu phân tích engine. Hoàn thành một ván để nhận gợi ý cá nhân.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Coach Button */}
      <button
        onClick={handleAskCoach}
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? 'Đang phân tích...' : 'Hỏi Quân sư về ván này'}
      </button>

      {/* Coach Response */}
      {coachResponse && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-lg">
              🤖
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">{coachResponse.reply}</p>

              {coachResponse.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Gợi ý:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {coachResponse.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {coachResponse.moveHint && (
                <div className="mt-3 rounded bg-slate-700/50 p-2">
                  <p className="text-xs text-slate-400">
                    Nước gợi ý: <span className="font-mono font-bold text-emerald-400">{coachResponse.moveHint}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Focused Move Context */}
      {focusedFact && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Đang xem nước {focusedFact.ply}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Đã đi</p>
              <p className="font-mono text-white">{focusedFact.playedMove.san}</p>
            </div>
            <div>
              <p className="text-slate-500">Nên đi</p>
              <p className="font-mono text-emerald-400">{focusedFact.bestMove.san || 'N/A'}</p>
            </div>
          </div>

          {focusedFact.centipawnLoss !== null && (
            <p className="mt-2 text-sm text-slate-400">
              Centipawn loss: <span className="font-mono text-white">{focusedFact.centipawnLoss}</span>
            </p>
          )}

          <div className="mt-2">
            <span className={`inline-block rounded px-2 py-1 text-xs font-bold ${
              focusedFact.classification === 'blunder' ? 'bg-red-500/20 text-red-400' :
              focusedFact.classification === 'mistake' ? 'bg-orange-500/20 text-orange-400' :
              focusedFact.classification === 'inaccuracy' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-slate-600 text-slate-300'
            }`}>
              {focusedFact.classification}
            </span>
          </div>

          {/* Tags */}
          {focusedFact.skillTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {focusedFact.skillTags.map(tag => (
                <span key={tag} className="rounded bg-slate-600 px-2 py-1 text-xs text-slate-300">
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Engine Source */}
          <p className="mt-3 text-xs text-slate-500">
            Nguồn: {focusedFact.engine.source}
            {focusedFact.engine.depth && ` @ depth ${focusedFact.engine.depth}`}
          </p>
        </div>
      )}
    </div>
  );
}
