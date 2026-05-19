import Navbar from './Navbar';

export default function Layout({ children }) {
  return <div className="min-h-screen bg-slate-900 text-slate-100">
    <Navbar />
    <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-8 md:py-12">{children}</main>
  </div>;
}
