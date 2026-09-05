import { useState } from 'react';

// Standard starting / midgame piece positions for prototype
const INITIAL_PIECES: Record<string, string> = {
  a8: '♜', b8: '♞', c8: '♝', d8: '♛', e8: '♚', f8: '♜', g8: ' ', h8: ' ',
  a7: '♟', b7: '♟', c7: '♟', d7: ' ', e7: ' ', f7: '♟', g7: '♟', h7: '♟',
  c6: ' ', e6: '♞', f6: ' ',
  d5: '♞', e5: ' ',
  c4: '♗', d4: '♙', f4: ' ',
  c3: '♙', f3: '♘',
  a2: '♙', b2: '♙', d2: '♘', f2: '♙', g2: '♙', h2: '♙',
  a1: '♖', b1: ' ', c1: ' ', d1: ' ', e1: ' ', f1: '♖', g1: '♔', h1: ' ',
  h5: '♕' // White queen moved to h5 in our prototype move 12
};

export interface ChessBoardPrototypeProps {
  lastMove?: { from: string; to: string };
  selectedSquare?: string;
  checkSquare?: string;
  interactive?: boolean;
  onSquareClick?: (square: string) => void;
  className?: string;
}

export function ChessBoardPrototype({
  lastMove = { from: 'd1', to: 'h5' },
  selectedSquare: propSelected,
  checkSquare,
  interactive = true,
  onSquareClick,
  className = '',
}: ChessBoardPrototypeProps) {
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selectedSquare = propSelected !== undefined ? propSelected : internalSelected;

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  const handleSquareClick = (square: string) => {
    if (!interactive) return;
    setInternalSelected(current => current === square ? null : square);
    if (onSquareClick) {
      onSquareClick(square);
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <div
        className="w-full max-w-[540px] aspect-square rounded-[8px] overflow-hidden shadow-sm border border-[var(--app-border)] p-1 bg-[var(--app-surface-raised)]"
        style={{ borderRadius: '10px' }}
      >
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-[6px] overflow-hidden">
          {ranks.map((rank, rIdx) =>
            files.map((file, fIdx) => {
              const square = `${file}${rank}`;
              const isLight = (rIdx + fIdx) % 2 === 0;
              const isSelected = selectedSquare === square;
              const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
              const isCheck = checkSquare === square;
              const piece = INITIAL_PIECES[square] || '';
              const isWhitePiece = piece && '♔♕♖♗♘♙'.includes(piece);

              return (
                <button
                  key={square}
                  type="button"
                  onClick={() => handleSquareClick(square)}
                  disabled={!interactive}
                  className="relative flex items-center justify-center p-0 m-0 border-none transition-colors duration-100 cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: isLight ? 'var(--board-light)' : 'var(--board-dark)',
                  }}
                  aria-label={`${square} ${piece ? (isWhitePiece ? 'quân trắng' : 'quân đen') : 'trống'}`}
                >
                  {/* Last Move Overlay (gold static) */}
                  {isLastMove && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: 'var(--board-last-move)' }}
                    />
                  )}

                  {/* Selected Square Overlay (accent) */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-[var(--app-accent)]"
                      style={{ backgroundColor: 'var(--board-selected)' }}
                    />
                  )}

                  {/* Check Indicator */}
                  {isCheck && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: 'var(--board-check)' }}
                    />
                  )}

                  {/* Rank coordinate label on column 0 */}
                  {fIdx === 0 && (
                    <span
                      className="absolute top-0.5 left-1 text-[10px] font-bold pointer-events-none opacity-60"
                      style={{ color: isLight ? 'var(--board-dark)' : 'var(--board-light)' }}
                    >
                      {rank}
                    </span>
                  )}

                  {/* File coordinate label on row 7 */}
                  {rIdx === 7 && (
                    <span
                      className="absolute bottom-0.5 right-1 text-[10px] font-bold pointer-events-none opacity-60"
                      style={{ color: isLight ? 'var(--board-dark)' : 'var(--board-light)' }}
                    >
                      {file}
                    </span>
                  )}

                  {/* Chess piece */}
                  {piece && piece !== ' ' && (
                    <span
                      className={`text-2xl sm:text-3xl md:text-4xl font-normal drop-shadow-xs transition-transform duration-75 ${
                        isWhitePiece ? 'text-white' : 'text-slate-900'
                      }`}
                      style={{
                        textShadow: isWhitePiece
                          ? '0 1px 2px rgba(0,0,0,0.6)'
                          : '0 1px 1px rgba(255,255,255,0.4)',
                      }}
                    >
                      {piece}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
