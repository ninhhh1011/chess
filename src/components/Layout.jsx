import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const isPlayPage = pathname.startsWith('/play');

  return <div className="min-h-screen bg-slate-900 text-slate-100">
    <Navbar />
    <main className={`mx-auto max-w-7xl px-2 sm:px-4 ${isPlayPage ? 'py-3 sm:py-4' : 'py-4 sm:py-8 md:py-12'}`}>{children}</main>
  </div>;
}
