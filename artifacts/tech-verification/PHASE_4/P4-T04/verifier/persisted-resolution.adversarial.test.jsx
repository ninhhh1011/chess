// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AnalysisCoach from '../../../../../src/components/review/AnalysisCoach';
import { buildCoachContext, generateCoachExplanation } from '../../../../../src/services/analysis/coach';
import { recordGameReview } from '../../../../../src/services/userProfileService';

const fact = {
  schemaVersion: 'analysis.v1',
  gameId: 'verifier-unpersisted-game',
  ply: 1,
  turn: 'w',
  fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  playedMove: {
    uci: 'e2e4',
    san: 'e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  },
  bestMove: {
    uci: 'd2d4',
    san: 'd4',
    fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
  },
  evalBefore: { type: 'cp', value: 30, display: '+0.30' },
  evalAfter: { type: 'cp', value: -100, display: '-1.00' },
  centipawnLoss: 130,
  classification: 'mistake',
  candidates: [{
    uci: 'd2d4',
    san: 'd4',
    eval: { type: 'cp', value: 30, display: '+0.30' },
    pv: ['d2d4'],
  }],
  skillTags: ['opening_principle'],
  engine: { source: 'stockfish_wasm', version: '18', depth: 10, movetimeMs: 450, multiPv: 1 },
  analyzedAt: '2026-09-06T00:00:00.000Z',
};

afterEach(() => localStorage.clear());

describe('P4-T04 verifier adversarial persisted resolution', () => {
  it('ignores forged moveContext played/best and uses the validated fact', () => {
    const analysis = {
      schemaVersion: 'gameAnalysis.v1',
      gameId: fact.gameId,
      pgn: '1. e4',
      playerSide: 'w',
      analysis: [fact],
      topMistakes: ['1'],
      summary: { totalMoves: 1, mistakesCount: 1, blundersCount: 0, inaccuraciesCount: 0, avgCPL: 130 },
    };
    const context = buildCoachContext(analysis, 1);
    context.moveContext.played = 'Qh5';
    context.moveContext.best = 'Qh5#';
    const response = generateCoachExplanation(context);
    expect(response.moveHint).toBe('d4');
    expect(response.reply).not.toContain('Qh5');
  });

  it('rejects an in-memory selected fact when no matching persisted fact/review exists', async () => {
    localStorage.clear();
    render(
      <AnalysisCoach
        playerSide="w"
        focusedEvidenceId="verifier-unpersisted-game:ply:1"
      />,
    );

    // P4-T04 requires resolution through persisted analysisFacts and gameReviews.factIds.
    // With no durable record, Coach must fail closed before offering an action.
    expect(screen.queryByRole('button', { name: /Quân sư về ván này/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Nước gợi ý:/i)).not.toBeInTheDocument();
    expect(screen.queryByText('d4')).not.toBeInTheDocument();
  });

  it('loads the persisted fact and fails closed again after its owning review is removed', async () => {
    recordGameReview({ reviewId: 'verifier-review', gameId: fact.gameId, facts: [structuredClone(fact)] });
    const evidenceId = `${fact.gameId}:ply:${fact.ply}`;
    const { rerender } = render(
      <AnalysisCoach playerSide="w" focusedEvidenceId={evidenceId} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Quân sư về ván này/i }));
    expect(await screen.findByText(/Nước gợi ý:/i)).toHaveTextContent('d4');

    const profile = JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile'));
    profile.persistence.gameReviews = [];
    localStorage.setItem('vuaCoUserTrainingProfile', JSON.stringify(profile));
    rerender(<AnalysisCoach playerSide="w" focusedEvidenceId={evidenceId} />);

    expect(screen.queryByRole('button', { name: /Quân sư về ván này/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Nước gợi ý:/i)).not.toBeInTheDocument();
  });
});
