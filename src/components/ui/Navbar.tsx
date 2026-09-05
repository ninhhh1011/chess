import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, ChessKnight, ChevronDown, BookOpen, Brain, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signOutUser } from '@/services/authService';
import { AppButton } from '@/ui/AppButton';
import { AppPopover } from '@/ui/AppPopover';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close mobile menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  async function handleLogout() {
    const result = await signOutUser();
    if (result.success) {
      setIsMobileMenuOpen(false);
      navigate('/');
    }
  }

  const accountInitial = (user && typeof user === 'object' && 'email' in user)
    ? String((user as { email?: string }).email?.[0] || 'U').toUpperCase()
    : 'U';

  const userEmail = (user && typeof user === 'object' && 'email' in user)
    ? String((user as { email?: string }).email || '')
    : '';

  const isPracticeActive = ['/learn', '/exercises', '/openings'].some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-bg)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <NavLink
          to="/"
          className="flex items-center gap-2.5 rounded-[8px] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          aria-label="Vua Cờ Trang chủ"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--app-accent)] text-[#0C100E] shadow-sm">
            <ChessKnight className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-[var(--app-foreground)] hidden sm:block">
            Ninh Lốp Trưởng
          </span>
        </NavLink>

        {/* Desktop Navigation */}
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1.5 md:flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm font-medium rounded-[8px] transition-colors duration-150 ${
                isActive
                  ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface)]'
              }`
            }
          >
            Trang chủ
          </NavLink>

          <NavLink
            to="/play"
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm font-medium rounded-[8px] transition-colors duration-150 ${
                isActive
                  ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface)]'
              }`
            }
          >
            Chơi cờ
          </NavLink>

          {/* Luyện tập Popover */}
          <AppPopover
            placement="bottom-start"
            trigger={
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[8px] transition-colors duration-150 ${
                  isPracticeActive
                    ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface)]'
                }`}
              >
                <span>Luyện tập</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            }
          >
            <div className="flex flex-col gap-1 w-48 p-1">
              <NavLink
                to="/learn"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[6px] transition-colors ${
                    isActive ? 'bg-[var(--app-surface-hover)] text-[var(--app-foreground)]' : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`
                }
              >
                <BookOpen className="h-4 w-4 text-[var(--app-accent)]" />
                <span>Học cờ cơ bản</span>
              </NavLink>

              <NavLink
                to="/exercises"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[6px] transition-colors ${
                    isActive ? 'bg-[var(--app-surface-hover)] text-[var(--app-foreground)]' : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`
                }
              >
                <Brain className="h-4 w-4 text-[var(--app-copper)]" />
                <span>Bài tập chiến thuật</span>
              </NavLink>

              <NavLink
                to="/openings"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[6px] transition-colors ${
                    isActive ? 'bg-[var(--app-surface-hover)] text-[var(--app-foreground)]' : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                  }`
                }
              >
                <Trophy className="h-4 w-4 text-[var(--app-warning)]" />
                <span>Kho Khai cuộc</span>
              </NavLink>
            </div>
          </AppPopover>

          <NavLink
            to="/training"
            className={({ isActive }) =>
              `px-3 py-1.5 text-sm font-medium rounded-[8px] transition-colors duration-150 ${
                isActive
                  ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface)]'
              }`
            }
          >
            Tiến bộ
          </NavLink>
        </nav>

        {/* Desktop Auth Section */}
        <div className="hidden items-center gap-2.5 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <div
                title={userEmail}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-xs font-bold text-[var(--app-accent)]"
              >
                {accountInitial}
              </div>
              <AppButton
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="h-3.5 w-3.5" />}
              >
                Đăng xuất
              </AppButton>
            </div>
          ) : (
            <>
              <AppButton
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Đăng nhập
              </AppButton>
              <AppButton
                variant="primary"
                size="sm"
                onClick={() => navigate('/signup')}
              >
                Đăng ký
              </AppButton>
            </>
          )}
        </div>

        {/* Mobile Menu Button - min 44x44px touch target */}
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface)] md:hidden cursor-pointer"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng di động"
          className="border-t border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-4 md:hidden animate-fadeIn"
        >
          <div className="flex flex-col gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded-[8px] transition-colors ${
                  isActive
                    ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                }`
              }
            >
              Trang chủ
            </NavLink>

            <NavLink
              to="/play"
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded-[8px] transition-colors ${
                  isActive
                    ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                }`
              }
            >
              Chơi cờ
            </NavLink>

            <NavLink
              to="/learn"
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded-[8px] transition-colors ${
                  isActive
                    ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                }`
              }
            >
              Học cờ cơ bản
            </NavLink>

            <NavLink
              to="/exercises"
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded-[8px] transition-colors ${
                  isActive
                    ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                }`
              }
            >
              Bài tập chiến thuật
            </NavLink>

            <NavLink
              to="/openings"
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded-[8px] transition-colors ${
                  isActive
                    ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                }`
              }
            >
              Kho Khai cuộc
            </NavLink>

            <NavLink
              to="/training"
              className={({ isActive }) =>
                `flex items-center min-h-[44px] px-3 py-2 text-sm font-medium rounded-[8px] transition-colors ${
                  isActive
                    ? 'bg-[var(--app-surface-raised)] text-[var(--app-foreground)] border border-[var(--app-border)]'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-surface-hover)]'
                }`
              }
            >
              Tiến bộ & Huấn luyện
            </NavLink>
          </div>

          <div className="mt-4 border-t border-[var(--app-border)] pt-4 flex flex-col gap-2">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-xs font-bold text-[var(--app-accent)]">
                    {accountInitial}
                  </div>
                  <span className="text-xs text-[var(--app-muted)] truncate max-w-[180px]">{userEmail}</span>
                </div>
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<LogOut className="h-3.5 w-3.5" />}
                >
                  Đăng xuất
                </AppButton>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <AppButton
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    navigate('/login');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Đăng nhập
                </AppButton>
                <AppButton
                  variant="primary"
                  size="md"
                  onClick={() => {
                    navigate('/signup');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Đăng ký
                </AppButton>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
