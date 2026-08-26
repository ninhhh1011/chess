import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './ui/Navbar';
import { pageVariants } from '@/design-system/animations';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const isPlayPage = pathname.startsWith('/play');

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-body">
      <Navbar />
      <main
        className={
          isPlayPage
            ? 'mx-auto w-full px-2 py-2 sm:px-3'
            : 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-12'
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
