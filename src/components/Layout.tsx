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
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-foreground)] flex flex-col">
      <Navbar />
      <main
        className={
          isPlayPage
            ? 'flex-1 mx-auto w-full px-2 py-2 sm:px-3'
            : 'flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10'
        }
      >
        {children}
      </main>
    </div>
  );
}
