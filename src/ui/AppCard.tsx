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
    ? 'cursor-pointer hover:shadow-[var(--shadow-floating)] hover:border-[var(--app-border-strong)] active:translate-y-px transition-all duration-150'
    : '';

  return (
    <HeroUICard
      className={`rounded-[24px] border border-[var(--app-border)] bg-white p-6 shadow-[var(--shadow-card)] transition-all ${interactiveStyles} ${className}`}
      style={{ borderRadius: '24px', ...style }}
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
