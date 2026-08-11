import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOutUser } from '../services/authService';
import logoImg from '../assets/avatarcoach.webp';
import { BRAND_NAMES, brandName } from '../config/brand';

const links = [
  { to: '/', label: 'Trang chủ' },
  { to: '/learn', label: 'Học cờ' },
  { to: '/play', label: 'Chơi cờ' },
  { to: '/exercises', label: 'Bài tập' },
  { to: '/openings', label: BRAND_NAMES.openingTrainer },
  { to: '/training', label: 'Huấn luyện' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  async function handleLogout() {
    const result = await signOutUser();
    if (result.success) {
      setIsMenuOpen(false);
      navigate('/');
    }
  }

  function goTo(path) {
    setIsMenuOpen(false);
    navigate(path);
  }

  const accountInitial = user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <NavLink to="/" className="flex min-w-0 items-center gap-3 text-base font-semibold text-slate-100 sm:text-lg">
          <img src={logoImg} alt={brandName} className="h-8 w-8 flex-none rounded-md border border-slate-700/80 object-cover" />
          <span className="truncate tracking-normal">{brandName}</span>
        </NavLink>

        <div className="hidden flex-wrap gap-2 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-slate-800 text-emerald-300 ring-1 ring-slate-700/70' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex flex-none items-center gap-2">
          {isAuthenticated ? (
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-sm font-semibold text-emerald-300">
                {accountInitial}
              </div>
              <span className="max-w-44 truncate text-sm font-medium text-slate-200">{user?.email}</span>
              <button onClick={handleLogout} className="btn-secondary">
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <button onClick={() => goTo('/login')} className="btn-secondary">
                Đăng nhập
              </button>
              <button onClick={() => goTo('/signup')} className="btn-primary">
                Đăng ký
              </button>
            </div>
          )}

          <button
            className="rounded-md border border-slate-700/80 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Mo menu"
            aria-expanded={isMenuOpen}
          >
            ☰
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-slate-800 bg-slate-950 md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-md px-4 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:bg-slate-900'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-xs font-semibold text-emerald-300">
                      {accountInitial}
                    </div>
                    <span className="min-w-0 truncate text-sm text-slate-300">{user?.email}</span>
                  </div>
                  <button onClick={handleLogout} className="btn-secondary px-4 py-3 text-center">
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => goTo('/login')} className="btn-secondary px-4 py-3 text-center">
                    Đăng nhập
                  </button>
                  <button onClick={() => goTo('/signup')} className="btn-primary px-4 py-3 text-center">
                    Đăng ký
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
