import { useState } from 'react';
import { Chess } from 'chess.js';

/**
 * OpeningExplorer - Visualize common openings with eco codes
 */
const OPENINGS = [
  {
    eco: 'C50',
    name: 'Italian Game',
    moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
    description: 'Phổ biến, kiểm soát trung tâm nhanh',
  },
  {
    eco: 'C60',
    name: 'Ruy Lopez',
    moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5',
    description: 'Khai cuộc cổ điển, kiểm soát trung tâm',
  },
  {
    eco: 'D00',
    name: "Queen's Pawn Game",
    moves: '1.d4 d5',
    description: 'Đen đáp trả nhanh ở trung tâm',
  },
  {
    eco: 'E60',
    name: "King's Indian Defense",
    moves: '1.d4 Nf6 2.c4 g6',
    description: 'Hypermodern, chiếm trung tâm bằng quân',
  },
  {
    eco: 'B20',
    name: 'Sicilian Defense',
    moves: '1.e4 c5',
    description: 'Phản công mạnh, phổ biến nhất',
  },
  {
    eco: 'A00',
    name: "Van Kruimans",
    moves: '1.b3',
    description: 'Bất ngờ, kiểm soát trung tâm gián tiếp',
  },
  {
    eco: 'A40',
    name: 'English Opening',
    moves: '1.c4',
    description: 'Linh hoạt, kiểm soát trung tâm',
  },
  {
    eco: 'C00',
    name: 'French Defense',
    moves: '1.e4 e6',
    description: 'Chắc chắn, chuẩn bị d5',
  },
];

function validateMoves(moveString) {
  try {
    const game = new Chess();
    const moves = moveString.split(' ').filter(m => m.match(/^[a-hNBRQKO][a-h0-9x\-+#=!?]+$/));
    for (const move of moves) {
      const result = game.move(move);
      if (!result) return null;
    }
    return game.fen();
  } catch {
    return null;
  }
}

export default function OpeningExplorer({ onSelect }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = OPENINGS.filter(
    o =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.eco.includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-primary">Khai cuộc phổ biến</h4>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Tìm khai cuộc..."
        className="w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-primary-400 focus:outline-none"
      />

      <div className="max-h-[300px] space-y-2 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-tertiary">Không tìm thấy khai cuộc</p>
        ) : (
          filtered.map(opening => (
            <div key={opening.eco} className="rounded-lg border border-border bg-bg-surface">
              <button
                onClick={() => setExpanded(expanded === opening.eco ? null : opening.eco)}
                className="flex w-full items-center justify-between p-3 text-left transition hover:bg-bg-elevated"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded border border-primary-400/30 bg-primary-400/10 px-2 py-0.5 text-xs font-bold text-primary-300">
                    {opening.eco}
                  </span>
                  <span className="text-sm font-medium text-text-primary">{opening.name}</span>
                </div>
                <span className={`text-text-tertiary transition-transform ${expanded === opening.eco ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {expanded === opening.eco && (
                <div className="border-t border-border px-3 py-3">
                  <p className="mb-2 text-xs text-text-secondary">{opening.description}</p>
                  <code className="block rounded bg-bg-base p-2 text-xs text-text-tertiary">
                    {opening.moves}
                  </code>
                  {onSelect && (
                    <button
                      onClick={() => onSelect(opening.moves)}
                      className="mt-2 w-full rounded border border-border bg-bg-base px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
                    >
                      Chơi với khai cuộc này
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
