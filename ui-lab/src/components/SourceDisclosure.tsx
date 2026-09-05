import { Info } from 'lucide-react';
import { AppTooltip } from '../ui/AppTooltip';
import { AppPopover } from '../ui/AppPopover';

export interface SourceDisclosureProps {
  source?: 'stockfish' | 'coach-basic' | 'coach-llm';
  engineDepth?: number;
  compact?: boolean;
}

/**
 * SourceDisclosure component (Section 11 Requirement):
 * Replaces the distracting multi-badge cluster (Engine / AI / Knowledge off)
 * with a clean, truthful line: "Nguồn: Stockfish · Diễn giải cơ bản"
 * with deep technical details accessible via AppTooltip or AppPopover.
 */
export function SourceDisclosure({
  source = 'coach-basic',
  engineDepth = 18,
  compact = false,
}: SourceDisclosureProps) {
  const sourceText = {
    stockfish: 'Nguồn: Stockfish 18 · Độ sâu tính toán',
    'coach-basic': 'Nguồn: Stockfish · Diễn giải cơ bản',
    'coach-llm': 'Nguồn: Stockfish · Diễn giải nâng cao',
  }[source];

  const tooltipDetail = `Độ sâu tính toán: ${engineDepth} ply. Động cơ Stockfish WebAssembly chạy ngoại tuyến cục bộ trên trình duyệt.`;

  if (compact) {
    return (
      <AppTooltip content={tooltipDetail} placement="top">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--app-muted)] cursor-help select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
          <span>{sourceText}</span>
          <Info className="h-3 w-3 text-[var(--app-subtle)]" />
        </div>
      </AppTooltip>
    );
  }

  return (
    <div className="flex items-center justify-between border-t border-[var(--app-border)] pt-2.5 mt-2 text-[11px] text-[var(--app-muted)] select-none">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
        <span>{sourceText}</span>
      </div>

      <AppPopover
        title="Chi tiết nguồn dữ liệu"
        trigger={
          <button
            type="button"
            className="flex items-center gap-1 text-[10px] text-[var(--app-subtle)] hover:text-[var(--app-foreground)] transition-colors"
            aria-label="Xem chi tiết nguồn dữ liệu phân tích"
          >
            <span>Chi tiết</span>
            <Info className="h-3 w-3" />
          </button>
        }
      >
        <div className="space-y-1.5 leading-relaxed text-[11px]">
          <p>
            <strong className="text-[var(--app-foreground)]">Động cơ:</strong> Stockfish 18 Wasm (Ngoại tuyến, độ trễ 0ms)
          </p>
          <p>
            <strong className="text-[var(--app-foreground)]">Độ sâu:</strong> {engineDepth} ply
          </p>
          <p>
            <strong className="text-[var(--app-foreground)]">Diễn giải:</strong> Luật cờ vua và thuật toán phân loại điểm centipawn
          </p>
        </div>
      </AppPopover>
    </div>
  );
}
