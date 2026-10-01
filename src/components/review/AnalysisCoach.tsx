/**
 * Phase 1 Coach - Engine-Backed
 *
 * Coach interprets from AnalysisFactV1 data only.
 * Does NOT invent moves, evals, or opening names.
 */

import { useState } from 'react';
import type { AnalysisFactV1, CoachResponse } from '../../types/analysis';
import { generateCoachExplanation } from '../../services/analysis/coach';
import { getAnalysisFactEvidenceId } from '../../services/analysis/analysisFact';
import { getUserProfile } from '../../services/userProfileService';
import { AppButton } from '../../ui/AppButton';
import { AppSurface } from '../../ui/AppSurface';
import { AppStatus } from '../../ui/AppStatus';
import { Bot, Lightbulb } from 'lucide-react';

interface AnalysisCoachProps {
  playerSide: 'w' | 'b';
  focusedEvidenceId: string;
}

function loadTrustedContext(focusedEvidenceId: string) {
  const persistence = getUserProfile().persistence;
  const review = persistence.gameReviews.find((item: { factIds: string[] }) =>
    item.factIds.includes(focusedEvidenceId));
  if (!review) return null;

  const factsById = new Map<string, AnalysisFactV1>(persistence.analysisFacts.map((fact: AnalysisFactV1) =>
    [getAnalysisFactEvidenceId(fact), fact]));
  const facts = review.factIds.map((evidenceId: string) => factsById.get(evidenceId));
  const focusedFact = factsById.get(focusedEvidenceId);
  if (!focusedFact || facts.some((fact: AnalysisFactV1 | undefined) => !fact)) return null;

  return {
    facts: facts as AnalysisFactV1[],
    focusedFact,
    topMistakes: (facts as AnalysisFactV1[]).map((fact) => String(fact.ply)),
  };
}

export default function AnalysisCoach({
  playerSide,
  focusedEvidenceId,
}: AnalysisCoachProps) {
  const [coachResponse, setCoachResponse] = useState<CoachResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const trustedContext = loadTrustedContext(focusedEvidenceId);
  const focusedFact = trustedContext?.focusedFact;

  const handleAskCoach = async () => {
    setIsLoading(true);

    try {
      const current = loadTrustedContext(focusedEvidenceId);
      if (!current) throw new Error('Trusted review fact unavailable');
      const context = {
        facts: current.facts,
        topMistakes: current.topMistakes,
        playerSide,
        moveContext: {
          played: current.focusedFact.playedMove.san,
          best: current.focusedFact.bestMove.san,
          ply: current.focusedFact.ply,
          fen: current.focusedFact.fenBefore,
          evidenceId: focusedEvidenceId,
        },
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

  if (!trustedContext) {
    return (
      <AppSurface variant="raised" radius="sm" className="p-4">
        <p className="text-xs text-[var(--app-muted)]">
          Chưa có dữ liệu phân tích engine. Hoàn thành một ván để nhận gợi ý cá nhân.
        </p>
      </AppSurface>
    );
  }

  const classificationVariant =
    focusedFact?.classification === 'blunder'
      ? 'danger'
      : focusedFact?.classification === 'mistake'
        ? 'copper'
        : focusedFact?.classification === 'inaccuracy'
          ? 'warning'
          : 'basic';

  return (
    <div className="space-y-3">
      {/* Coach Button */}
      <AppButton
        onClick={handleAskCoach}
        isLoading={isLoading}
        variant="primary"
        className="w-full text-xs font-semibold"
        leftIcon={<Bot className="h-4 w-4" />}
      >
        Hỏi Quân sư về ván này
      </AppButton>

      {/* Coach Response */}
      {coachResponse && (
        <AppSurface
          variant="base"
          radius="sm"
          className="border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3.5 space-y-2.5"
        >
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[var(--app-accent)] text-[#0C100E]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--app-foreground)] leading-relaxed">{coachResponse.reply}</p>

              {coachResponse.suggestions.length > 0 && (
                <div className="mt-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--app-subtle)]">
                    Gợi ý:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {coachResponse.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-[var(--app-muted)]">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {coachResponse.moveHint && (
                <div className="mt-2 rounded-[6px] bg-[var(--app-surface-raised)] p-2 border border-[var(--app-border)]">
                  <p className="text-xs text-[var(--app-muted)] flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-[var(--app-accent)] shrink-0" />
                    Nước gợi ý: <span className="font-mono font-bold text-[var(--app-accent)]">{coachResponse.moveHint}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </AppSurface>
      )}

      {/* Focused Move Context */}
      {focusedFact && (
        <AppSurface variant="raised" radius="sm" className="p-3.5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--app-subtle)]">
            Đang xem nước {focusedFact.ply}
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[var(--app-muted)]">Đã đi</p>
              <p className="font-mono font-bold text-[var(--app-foreground)]">{focusedFact.playedMove.san}</p>
            </div>
            <div>
              <p className="text-[var(--app-muted)]">Nên đi</p>
              <p className="font-mono font-bold text-[var(--app-accent)]">{focusedFact.bestMove.san || 'N/A'}</p>
            </div>
          </div>

          {focusedFact.centipawnLoss !== null && (
            <p className="text-xs text-[var(--app-muted)]">
              Centipawn loss: <span className="font-mono text-[var(--app-foreground)]">{focusedFact.centipawnLoss}</span>
            </p>
          )}

          <div className="pt-1">
            <AppStatus variant={classificationVariant} size="sm">
              {focusedFact.classification}
            </AppStatus>
          </div>

          {/* Tags */}
          {focusedFact.skillTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {focusedFact.skillTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[4px] bg-[var(--app-surface)] border border-[var(--app-border)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]"
                >
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Engine Source */}
          <p className="text-[11px] text-[var(--app-subtle)] pt-1 border-t border-[var(--app-border)]">
            Nguồn: {focusedFact.engine.source}
            {focusedFact.engine.depth && ` @ depth ${focusedFact.engine.depth}`}
          </p>
        </AppSurface>
      )}
    </div>
  );
}
