import React from 'react';
import { Card as HeroUICard } from '@heroui/react';

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  isInteractive?: boolean;
  isPressable?: boolean;
}

export function AppCard({
  children,
  className = '',
  isInteractive = false,
  isPressable = false,
  style,
  ...rest
}: AppCardProps) {
  const effectiveInteractive = isInteractive || isPressable;
  const interactiveStyles = effectiveInteractive
    ? 'cursor-pointer hover:border-[var(--app-accent)]/40 hover:bg-[var(--app-surface-hover)] active:translate-y-px transition-all duration-150'
    : '';

  return (
    <HeroUICard
      className={`rounded-[10px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 transition-colors ${interactiveStyles} ${className}`}
      style={{ borderRadius: '10px', ...style }}
      {...rest}
    >
      {children}
    </HeroUICard>
  );
}

AppCard.Header = HeroUICard.Header;
AppCard.Title = HeroUICard.Title;
AppCard.Description = HeroUICard.Description;
AppCard.Content = HeroUICard.Content;
AppCard.Footer = HeroUICard.Footer;
