import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MoveHistory from './MoveHistory';
import * as ChessGameContext from '../../contexts/ChessGameContext';

describe('MoveHistory component', () => {
  it('renders empty message when no moves exist', () => {
    vi.spyOn(ChessGameContext, 'useChessGame').mockReturnValue({
      moveHistory: [],
      moveAnnotations: {},
      currentPgn: '',
      analysisMode: false,
      goToAnalysisPly: vi.fn(),
      analysisPly: 0,
    });

    render(<MoveHistory />);
    expect(screen.getByText('Chưa có nước cờ nào được thực hiện.')).toBeInTheDocument();
  });

  it('renders moves and calls goToAnalysisPly when in analysisMode', () => {
    const goToAnalysisPlyMock = vi.fn();
    vi.spyOn(ChessGameContext, 'useChessGame').mockReturnValue({
      moveHistory: ['e4', 'e5'],
      moveAnnotations: {
        0: { symbol: '!', label: 'Nước đi hay', tone: 'great' },
      },
      currentPgn: '1. e4 e5',
      analysisMode: true,
      goToAnalysisPly: goToAnalysisPlyMock,
      analysisPly: 1,
    });

    render(<MoveHistory />);
    expect(screen.getByText('e4')).toBeInTheDocument();
    expect(screen.getByText('e5')).toBeInTheDocument();
    expect(screen.getByText('!')).toBeInTheDocument();

    const moveButton = screen.getByText('e4').closest('button');
    expect(moveButton).toBeInTheDocument();
    fireEvent.click(moveButton);
    expect(goToAnalysisPlyMock).toHaveBeenCalledWith(1);
  });
});
