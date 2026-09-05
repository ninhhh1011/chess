import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChessKnight, Menu, X, Lock } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan' },
  { to: '/home', label: '1. Trang chủ' },
  { to: '/lobby', label: '2. Tiền sảnh' },
  { to: '/play', label: '3. Chơi cờ' },
  { to: '/review', label: '4. Đánh giá ván' },
  { to: '/progress', label: '5. Lộ trình' },
  { to: '/components', label: 'Components' },
];

export interface PrototypeShellProps {
  children: React.ReactNode;
}

export function PrototypeShell({ children }: PrototypeShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-foreground)] flex flex-col font-sans transition-colors duration-150">
      {/* Top Banner indicating prototype */}
      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--app-accent)] text-[var(--app-bg)] shadow-xs">
              <ChessKnight className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-[var(--app-foreground)] block">
                Ninh Lốp Trưởng <span className="text-[var(--app-accent)]">Chess</span>
              </span>
              <span className="text-[9px] font-mono text-[var(--app-subtle)] uppercase tracking-wider block">
                UI Lab · Option C Locked
              </span>
            </div>
          </NavLink>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors ${
                    isActive
                      ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)] font-bold'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Status Indicator: Option C Locked */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] text-[11px] text-[var(--app-muted)] select-none">
              <span className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />
              <span className="font-medium text-[var(--app-foreground)]">Option C</span>
              <span className="text-[var(--app-subtle)]">· Pine/Copper</span>
              <Lock className="h-3 w-3 text-[var(--app-copper)] ml-0.5" />
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-foreground)] md:hidden"
              aria-label="Mở menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="border-t border-[var(--app-border)] bg-[var(--app-surface)] p-3 md:hidden space-y-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 mb-2 rounded-[6px] bg-[var(--app-surface-raised)] text-xs text-[var(--app-muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--app-accent)]" />
              <span>Theme: <strong>Option C (Charcoal + Pine + Copper) Đã khóa</strong></span>
            </div>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 text-xs font-semibold rounded-[6px] transition-colors ${
                    isActive
                      ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] font-bold'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer Notice */}
      <footer className="border-t border-[var(--app-border)] bg-[var(--app-surface)] py-3 px-4 text-center text-[11px] text-[var(--app-subtle)]">
        <span>Option C Prototype Locked · Charcoal (#0C100E) · Pine Green (#3FAD79) · Copper (#C88954) · HeroUI v3.2.4 · Tailwind v4</span>
      </footer>
    </div>
  );
}
