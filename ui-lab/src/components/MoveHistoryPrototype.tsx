import { useState } from 'react';
import { PROTOTYPE_MOVES, type MoveItem } from '../fixtures/prototypeOnlyData';

export interface MoveHistoryPrototypeProps {
  moves?: MoveItem[];
  currentPly?: number;
  onSelectMove?: (moveIndex: number) => void;
  className?: string;
}

export function MoveHistoryPrototype({
  moves = PROTOTYPE_MOVES,
  onSelectMove,
  className = '',
}: MoveHistoryPrototypeProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(moves.length - 1);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    if (onSelectMove) onSelectMove(idx);
  };

  const getBadge = (classification?: string) => {
    switch (classification) {
      case 'blunder':
        return <span className="ml-1 text-[10px] font-bold text-[var(--app-danger)]">??</span>;
      case 'mistake':
        return <span className="ml-1 text-[10px] font-bold text-[var(--app-warning)]">?</span>;
      case 'inaccuracy':
        return <span className="ml-1 text-[10px] font-bold text-amber-400">?!</span>;
      case 'brilliant':
        return <span className="ml-1 text-[10px] font-bold text-[var(--app-chess-gold)]">!!</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-[var(--app-border)] text-[11px] font-bold uppercase tracking-wider text-[var(--app-subtle)]">
        <span>Nước</span>
        <span>Trắng</span>
        <span>Đen</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1 space-y-0.5 text-xs font-mono">
        {moves.map((move, idx) => {
          const isSelected = selectedIdx === idx;
          return (
            <div
              key={move.number}
              className={`grid grid-cols-3 items-center py-1 px-2 rounded-[6px] transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[var(--app-surface-raised)] ring-1 ring-[var(--app-accent)] font-semibold'
                  : 'hover:bg-[var(--app-surface-hover)] text-[var(--app-foreground)]'
              }`}
              onClick={() => handleSelect(idx)}
            >
              <span className="text-[var(--app-subtle)] font-normal text-[11px]">
                {move.number}.
              </span>
              <span className="flex items-center">
                {move.white}
                {getBadge(move.whiteClassification)}
              </span>
              <span className="flex items-center text-[var(--app-muted)]">
                {move.black || ''}
                {getBadge(move.blackClassification)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
