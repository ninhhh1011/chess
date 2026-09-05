import React from 'react';

export interface AppStatusProps {
  variant?: 'engine' | 'ai' | 'basic' | 'warning' | 'danger' | 'gold';
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function AppStatus({
  variant = 'engine',
  children,
  icon,
  size = 'sm',
  className = '',
}: AppStatusProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  const variantStyles = {
    engine: 'bg-[var(--app-success)]/12 text-[var(--app-success)] border-[var(--app-success)]/25',
    ai: 'bg-[var(--app-accent)]/12 text-[var(--app-accent)] border-[var(--app-accent)]/25',
    basic: 'bg-[var(--app-surface-hover)] text-[var(--app-muted)] border-[var(--app-border)]',
    warning: 'bg-[var(--app-warning)]/12 text-[var(--app-warning)] border-[var(--app-warning)]/25',
    danger: 'bg-[var(--app-danger)]/12 text-[var(--app-danger)] border-[var(--app-danger)]/25',
    gold: 'bg-[var(--app-chess-gold)]/15 text-[var(--app-chess-gold)] border-[var(--app-chess-gold)]/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-[6px] border ${variantStyles} ${sizeClasses} ${className}`}
      style={{ borderRadius: '6px' }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export interface TruthfulSourceLineProps {
  source: 'stockfish' | 'coach-basic' | 'coach-llm' | 'unavailable';
  details?: string;
}

export function TruthfulSourceLine({ source, details }: TruthfulSourceLineProps) {
  const sourceLabels = {
    stockfish: 'Nguồn: Stockfish 18 · Độ sâu tính toán tức thời',
    'coach-basic': 'Nguồn: Stockfish · Diễn giải cơ bản',
    'coach-llm': 'Nguồn: Stockfish · Trợ lý AI nâng cao',
    unavailable: 'Nguồn: Trực tuyến tạm ngưng · Chế độ ngoại tuyến',
  }[source];

  return (
    <div className="flex items-center justify-between text-[11px] text-[var(--app-subtle)] border-t border-[var(--app-border)] pt-2 mt-2 select-none">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
        <span>{sourceLabels}</span>
      </div>
      {details && <span className="text-[10px] text-[var(--app-muted)]">{details}</span>}
    </div>
  );
}
