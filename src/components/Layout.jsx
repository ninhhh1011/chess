import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const isPlayPage = pathname.startsWith('/play');

  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <Navbar />
    <main className={isPlayPage ? 'mx-auto w-full px-2 py-2 sm:px-3' : 'mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8 md:py-12'}>{children}</main>
  </div>;
}
