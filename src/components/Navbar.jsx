import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useIsSupabaseConfigured } from '../contexts/AuthContext';
import { signOutUser } from '../services/authService';
import logoImg from '../assets/avatarcoach.webp';

const links = [
  { to: '/', label: 'Trang chủ' },
  { to: '/learn', label: 'Học cờ' },
  { to: '/play', label: 'Chơi cờ' },
  { to: '/exercises', label: 'Bài tập' },
  { to: '/openings', label: 'Khai cuộc' },
  { to: '/training', label: 'Huấn luyện' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const isSupabaseConfigured = useIsSupabaseConfigured();

  async function handleLogout() {
    const result = await signOutUser();
    if (result.success) {
      navigate('/');
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-slate-950 border-b border-slate-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <NavLink to="/" className="flex items-center gap-3 text-xl font-bold text-slate-100">
          <img src={logoImg} alt="Vua Cờ" className="h-9 w-9 rounded-md object-cover shadow-sm" /> Vua Cờ
        </NavLink>

        {/* Desktop menu */}
        <div className="hidden flex-wrap gap-2 md:flex">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({isActive}) => `rounded-md px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-slate-800 text-emerald-500' : 'text-slate-400 hover:text-slate-200'}`
            }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-bold text-slate-200 md:block">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="btn-secondary hidden md:block"
              >
                Đăng xuất
              </button>
            </div>
          ) : isSupabaseConfigured ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary hidden md:block"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="btn-primary"
              >
                Đăng ký
              </button>
            </div>
          ) : null}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="text-2xl text-slate-100">☰</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-900 bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex flex-col gap-2">
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({isActive}) => `rounded-md px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-800 text-emerald-500' : 'text-slate-400 hover:bg-slate-900'}`
                }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <span className="px-4 text-sm text-slate-400">{user?.email}</span>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary px-4 py-3 text-center"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : isSupabaseConfigured ? (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="btn-secondary px-4 py-3 text-center"
                  >
                    Đăng nhập
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="btn-primary px-4 py-3 text-center"
                  >
                    Đăng ký
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
