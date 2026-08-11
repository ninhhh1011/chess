import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEngineAnalysis } from './useEngineAnalysis';
import * as stockfishService from '../services/stockfishService';

vi.mock('../services/stockfishService', () => ({
  analyzeFen: vi.fn(),
}));

describe('useEngineAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('analyzes FEN when autoAnalyze is true', async () => {
    stockfishService.analyzeFen.mockResolvedValueOnce({
      bestMove: 'e2e4',
      evaluation: { type: 'cp', value: 30 },
      pv: ['e2e4'],
    });

    const { result } = renderHook(() => useEngineAnalysis({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      enabled: true,
    }));

    await waitFor(() => {
      expect(result.current.analysis).toMatchObject({
        bestMove: 'e2e4',
        evaluation: { type: 'cp', value: 30 },
      });
      expect(result.current.isAnalyzing).toBe(false);
    });

    expect(stockfishService.analyzeFen).toHaveBeenCalled();
  });

  it('does not analyze when autoAnalyze is false', () => {
    renderHook(() => useEngineAnalysis({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      enabled: false,
    }));

    expect(stockfishService.analyzeFen).not.toHaveBeenCalled();
  });
});
