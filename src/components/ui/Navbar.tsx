import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, ChessKnight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signOutUser } from '@/services/authService';
import { Button } from '@/design-system/primitives';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Trang chủ' },
  { to: '/learn', label: 'Học cờ' },
  { to: '/play', label: 'Chơi cờ' },
  { to: '/exercises', label: 'Bài tập' },
  { to: '/openings', label: 'Khai cuộc' },
  { to: '/training', label: 'Huấn luyện' },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  async function handleLogout() {
    const result = await signOutUser();
    if (result.success) {
      setIsMobileMenuOpen(false);
      navigate('/');
    }
  }

  const accountInitial = user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-base/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <ChessKnight className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-text-primary hidden sm:block">
            Ninh Lốp Trưởng
          </span>
        </NavLink>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative px-4 py-2 text-sm font-medium transition-colors rounded-lg',
                  isActive
                    ? 'text-text-primary bg-bg-elevated'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary-500"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-elevated text-sm font-semibold text-primary-500 border border-border">
                {accountInitial}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
                Đăng xuất
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Đăng nhập
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                Đăng ký
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border overflow-hidden md:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-4">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'px-4 py-3 text-sm font-medium transition-colors rounded-lg',
                        isActive
                          ? 'text-text-primary bg-bg-elevated'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-elevated text-sm font-semibold text-primary-500">
                        {accountInitial}
                      </div>
                      <span className="text-sm text-text-secondary">{user?.email}</span>
                    </div>
                    <Button variant="secondary" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
                      Đăng xuất
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}>
                      Đăng nhập
                    </Button>
                    <Button variant="primary" onClick={() => { navigate('/signup'); setIsMobileMenuOpen(false); }}>
                      Đăng ký
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
