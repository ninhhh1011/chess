import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EngineAnalysisPanel from './EngineAnalysisPanel';
import { analyzeFen } from '../../services/stockfishService';

vi.mock('../../services/stockfishService', () => ({
  analyzeFen: vi.fn(),
  isEngineReady: () => true,
}));
vi.mock('./GameReviewPanel', () => ({ default: () => null }));
vi.mock('../../ui/AppButton', () => ({ AppButton: ({ children, isLoading, variant, size, ...props }) => <button {...props}>{children}</button> }));
vi.mock('../../ui/AppStatus', () => ({ AppStatus: ({ children }) => <span>{children}</span> }));
vi.mock('../../ui/AppSwitch', () => ({ AppSwitch: () => null }));
vi.mock('../../ui/AppSurface', () => ({ AppSurface: ({ children }) => <div>{children}</div> }));

const props = { fen: 'position', onAutoAnalyzeChange: vi.fn() };

describe('EngineAnalysisPanel source disclosure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not claim an engine source before analysis returns', () => {
    render(<EngineAnalysisPanel {...props} />);
    expect(screen.getByText(/Ngu/)).toBeInTheDocument();
  });

  it('passes its request generation to the best-move callback', async () => {
    const onAnalysisRequestStart = vi.fn(() => 17);
    const onBestMove = vi.fn();
    vi.mocked(analyzeFen).mockResolvedValue({
      source: 'stockfish_wasm',
      fen: props.fen,
      bestMove: 'e2e4',
      evaluation: { display: '0.2' },
      pv: [],
    });
    render(<EngineAnalysisPanel {...props} onAnalysisRequestStart={onAnalysisRequestStart} onBestMove={onBestMove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Phân tích' }));

    await waitFor(() => expect(onBestMove).toHaveBeenCalledWith(
      { bestMove: 'e2e4', fen: props.fen, evaluation: { display: '0.2' } },
      17,
    ));
    expect(onAnalysisRequestStart).toHaveBeenCalledOnce();
  });

  it('keeps the stopped status when analysis is cancelled', async () => {
    const onBestMove = vi.fn();
    vi.mocked(analyzeFen).mockImplementation(({ signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), { once: true });
    }));
    render(<EngineAnalysisPanel {...props} onBestMove={onBestMove} />);

    fireEvent.click(screen.getByRole('button', { name: /ph/i }));
    fireEvent.click(screen.getByRole('button', { name: /d.*ng/i }));
    expect(vi.mocked(analyzeFen).mock.calls[0][0].signal.aborted).toBe(true);

    await waitFor(() => expect(screen.getByText('Đã dừng')).toBeInTheDocument());
    expect(screen.queryByText('Lỗi')).not.toBeInTheDocument();
    expect(onBestMove).not.toHaveBeenCalled();
  });

  it('cancels and ignores a request when the FEN changes', async () => {
    let resolveAnalysis;
    const onBestMove = vi.fn();
    vi.mocked(analyzeFen).mockImplementation(() => new Promise((resolve) => { resolveAnalysis = resolve; }));
    const { rerender } = render(<EngineAnalysisPanel {...props} onBestMove={onBestMove} />);

    fireEvent.click(screen.getByRole('button', { name: /ph/i }));
    const oldSignal = vi.mocked(analyzeFen).mock.calls[0][0].signal;
    rerender(<EngineAnalysisPanel {...props} fen="new-position" onBestMove={onBestMove} />);
    expect(oldSignal.aborted).toBe(true);
    expect(screen.getByText('Sẵn sàng')).toBeInTheDocument();
    resolveAnalysis({ source: 'stockfish_wasm', fen: props.fen, bestMove: 'e2e4', evaluation: null, pv: [] });

    await waitFor(() => expect(screen.getByText(/Ngu/)).toBeInTheDocument());
    expect(onBestMove).not.toHaveBeenCalled();
  });

  it('cancels on unmount and ignores a late result', async () => {
    let resolveAnalysis;
    const onBestMove = vi.fn();
    vi.mocked(analyzeFen).mockImplementation(() => new Promise((resolve) => { resolveAnalysis = resolve; }));
    const { unmount } = render(<EngineAnalysisPanel {...props} onBestMove={onBestMove} />);

    fireEvent.click(screen.getByRole('button', { name: /ph/i }));
    const signal = vi.mocked(analyzeFen).mock.calls[0][0].signal;
    unmount();
    expect(signal.aborted).toBe(true);
    resolveAnalysis({ source: 'stockfish_wasm', fen: props.fen, bestMove: 'e2e4', evaluation: null, pv: [] });
    await Promise.resolve();
    expect(onBestMove).not.toHaveBeenCalled();
  });

  it('prevents an older request from overwriting a newer result', async () => {
    const resolvers = [];
    const onBestMove = vi.fn();
    vi.mocked(analyzeFen).mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
    const { rerender } = render(<EngineAnalysisPanel {...props} onBestMove={onBestMove} />);

    fireEvent.click(screen.getByRole('button', { name: /ph/i }));
    rerender(<EngineAnalysisPanel {...props} fen="new-position" onBestMove={onBestMove} />);
    fireEvent.click(screen.getByRole('button', { name: /ph/i }));
    resolvers[0]({ source: 'stockfish_wasm', fen: props.fen, bestMove: 'e2e4', evaluation: null, pv: [] });
    resolvers[1]({ source: 'stockfish_wasm', fen: 'new-position', bestMove: 'd2d4', evaluation: null, pv: [] });

    await waitFor(() => expect(onBestMove).toHaveBeenCalledTimes(1));
    expect(onBestMove).toHaveBeenCalledWith(
      { bestMove: 'd2d4', fen: 'new-position', evaluation: null },
      undefined,
    );
  });

  it.each([
    ['stockfish_wasm', 'Nguồn: Stockfish 18'],
    ['fallback', 'Nguồn: Engine dự phòng'],
  ])('discloses the returned %s source', async (source, disclosure) => {
    vi.mocked(analyzeFen).mockResolvedValue({
      source,
      fen: props.fen,
      bestMove: null,
      evaluation: null,
      pv: [],
    });
    render(<EngineAnalysisPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /ph/i }));
    await waitFor(() => expect(screen.getByText(source === 'fallback' ? /Engine/ : /Stockfish 18/)).toBeInTheDocument());
  });
});
