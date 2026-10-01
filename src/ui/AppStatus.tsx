import React from 'react';
import { Chip as HeroUIChip } from '@heroui/react';

export interface AppStatusProps {
  variant?: 'engine' | 'ai' | 'basic' | 'warning' | 'danger' | 'copper' | 'teal';
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
  const colorMap: Record<string, 'accent' | 'danger' | 'default' | 'success' | 'warning'> = {
    engine: 'success',
    teal: 'success',
    ai: 'accent',
    basic: 'default',
    warning: 'warning',
    danger: 'danger',
    copper: 'accent',
  };

  return (
    <HeroUIChip
      color={colorMap[variant] || 'default'}
      variant="secondary"
      size={size}
      className={`inline-flex items-center gap-1.5 font-medium ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <HeroUIChip.Label>{children}</HeroUIChip.Label>
    </HeroUIChip>
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
    'coach-llm': 'Nguồn: Stockfish · AI Coach',
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
