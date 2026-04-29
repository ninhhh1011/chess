import Navbar from './Navbar';

export default function Layout({ children }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(214,167,75,.25),transparent_34%),linear-gradient(135deg,#17120d,#2b2118_45%,#0f0b08)] text-cream">
    <Navbar />
    <main className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-8 md:py-12">{children}</main>
  </div>;
}
