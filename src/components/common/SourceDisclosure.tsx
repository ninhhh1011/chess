import { Info } from 'lucide-react';
import { AppTooltip } from '@/ui/AppTooltip';
import { AppPopover } from '@/ui/AppPopover';
import { AppButton } from '@/ui/AppButton';

export interface SourceDisclosureProps {
  source?: 'stockfish' | 'coach-basic' | 'coach-llm' | 'unavailable';
  engineDepth?: number;
  compact?: boolean;
}

/**
 * SourceDisclosure component (Sections 14 & 16 Requirement):
 * Displays the source that actually produced the current result.
 */
export function SourceDisclosure({
  source = 'coach-basic',
  engineDepth = 18,
  compact = false,
}: SourceDisclosureProps) {
  const sourceText = {
    stockfish: 'Nguồn: Stockfish 18 · Độ sâu tính toán',
    'coach-basic': 'Nguồn: Diễn giải cơ bản · Không dùng AI',
    'coach-llm': 'Nguồn: AI Coach',
    unavailable: 'Nguồn: Ngoại tuyến · Tạm dừng trực tuyến',
  }[source];

  const tooltipDetail = {
    stockfish: `Độ sâu tính toán: ${engineDepth} ply. Động cơ Stockfish WebAssembly chạy cục bộ trên trình duyệt.`,
    'coach-basic': 'Phản hồi theo quy tắc cơ bản, không phải nội dung từ nhà cung cấp AI.',
    'coach-llm': 'Phản hồi do nhà cung cấp AI tạo qua endpoint Coach.',
    unavailable: 'Dịch vụ trực tuyến hiện không khả dụng.',
  }[source];

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
          <AppButton
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-[10px] text-[var(--app-subtle)] hover:text-[var(--app-foreground)] flex items-center gap-1 min-h-0"
            aria-label="Xem chi tiết nguồn dữ liệu phân tích"
          >
            <span>Chi tiết</span>
            <Info className="h-3 w-3" />
          </AppButton>
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
            <strong className="text-[var(--app-foreground)]">Diễn giải:</strong> Phân tích centipawn và nhận xét nước cờ
          </p>
        </div>
      </AppPopover>
    </div>
  );
}
