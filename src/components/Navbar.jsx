import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Trang chủ' },
  { to: '/learn', label: 'Học cờ' },
  { to: '/play', label: 'Chơi cờ' },
  { to: '/exercises', label: 'Bài tập' },
];

export default function Navbar() {
  return <nav className="sticky top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
      <NavLink to="/" className="flex items-center gap-3 text-2xl font-black text-cream">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-gold to-amber-700 shadow-glow">♔</span> Vua Cờ
      </NavLink>
      <div className="flex flex-wrap gap-2">
        {links.map(link => <NavLink key={link.to} to={link.to} className={({isActive}) => `rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-gold text-ink' : 'text-cream/80 hover:bg-white/10 hover:text-cream'}`}>{link.label}</NavLink>)}
      </div>
    </div>
  </nav>;
}
