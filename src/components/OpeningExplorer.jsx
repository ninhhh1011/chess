import { useState } from 'react';
import { Chess } from 'chess.js';
import { AppField } from '@/ui/AppField';
import { AppStatus } from '@/ui/AppStatus';
import { AppButton } from '@/ui/AppButton';
import { AppSurface } from '@/ui/AppSurface';
import { ChevronDown, Search } from 'lucide-react';

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
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--app-subtle)]">Khai cuộc phổ biến</h4>
      </div>

      <AppField
        value={search}
        onChange={setSearch}
        placeholder="Tìm khai cuộc..."
        leftIcon={<Search className="h-4 w-4 text-[var(--app-muted)]" />}
      />

      <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--app-muted)]">Không tìm thấy khai cuộc</p>
        ) : (
          filtered.map(opening => (
            <AppSurface key={opening.eco} className="border border-[var(--app-border)] overflow-hidden">
              <AppButton
                variant="ghost"
                onClick={() => setExpanded(expanded === opening.eco ? null : opening.eco)}
                aria-expanded={expanded === opening.eco}
                className="flex w-full items-center justify-between p-2.5 h-auto rounded-none text-left transition hover:bg-[var(--app-surface-hover)] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <AppStatus variant="teal" size="sm">
                    {opening.eco}
                  </AppStatus>
                  <span className="text-xs font-semibold text-[var(--app-foreground)]">{opening.name}</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-[var(--app-muted)] transition-transform duration-180 ${
                    expanded === opening.eco ? 'rotate-180' : ''
                  }`}
                />
              </AppButton>

              {expanded === opening.eco && (
                <div className="border-t border-[var(--app-border)] p-2.5 space-y-2 bg-[var(--app-surface-raised)]">
                  <p className="text-xs text-[var(--app-muted)]">{opening.description}</p>
                  <code className="block rounded-[6px] bg-[var(--app-surface)] p-2 text-xs font-mono text-[var(--app-foreground)] border border-[var(--app-border)]">
                    {opening.moves}
                  </code>
                  {onSelect && (
                    <AppButton
                      variant="outline"
                      size="sm"
                      onClick={() => onSelect(opening.moves)}
                      className="w-full mt-1"
                    >
                      Chơi với khai cuộc này
                    </AppButton>
                  )}
                </div>
              )}
            </AppSurface>
          ))
        )}
      </div>
    </div>
  );
}
