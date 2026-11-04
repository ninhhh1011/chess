import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './ui/Navbar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const isPlayPage = pathname.startsWith('/play');

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-foreground)] flex flex-col font-sans selection:bg-[var(--app-tertiary)] selection:text-[#030302]">
      <Navbar />
      <main
        className={
          isPlayPage
            ? 'flex-1 mx-auto w-full px-2 py-4 sm:px-4 sm:py-6'
            : 'flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12'
        }
      >
        {children}
      </main>
    </div>
  );
}
