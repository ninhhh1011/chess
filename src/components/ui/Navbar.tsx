import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, LogOut, ChessKnight, ChevronDown, BookOpen, Brain, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signOutUser } from '@/services/authService';
import { AppButton } from '@/ui/AppButton';
import { AppPopover } from '@/ui/AppPopover';
import { AppDrawer } from '@/ui/AppDrawer';
import { AppAvatar } from '@/ui/AppAvatar';
import { AppMenu } from '@/ui/AppMenu';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isAuthenticated = Boolean(user);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    const result = await signOutUser(signOut);
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

  const userMenuItems = [
    {
      id: 'profile',
      label: userEmail || 'Tài khoản',
      disabled: true,
    },
    {
      id: 'training',
      label: 'Tiến độ học tập',
      onClick: () => navigate('/training'),
    },
    {
      id: 'logout',
      label: 'Đăng xuất',
      icon: <LogOut className="h-3.5 w-3.5" />,
      variant: 'danger' as const,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full pt-3 sm:pt-4 px-3 sm:px-6 pointer-events-none transition-all">
      <div className="pointer-events-auto mx-auto max-w-5xl rounded-full bg-white/85 backdrop-blur-md border border-[var(--app-border)] shadow-[var(--shadow-floating)] py-2 sm:py-2.5 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <NavLink
          to="/"
          className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-secondary)]"
          aria-label="Vua Cờ Trang chủ"
        >
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#030302] text-white shadow-xs">
            <ChessKnight className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#030302]">
            Ninh Lốp Trưởng
          </span>
        </NavLink>

        {/* Desktop Navigation */}
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--app-muted-surface)] text-[#030302] font-semibold shadow-2xs'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]/60'
              }`
            }
          >
            Trang chủ
          </NavLink>

          <NavLink
            to="/play"
            className={({ isActive }) =>
              `px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--app-muted-surface)] text-[#030302] font-semibold shadow-2xs'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]/60'
              }`
            }
          >
            Chơi cờ
          </NavLink>

          {/* Luyện tập Popover */}
          <AppPopover
            title="Luyện tập & Rèn luyện"
            placement="bottom"
            trigger={
              <span
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 cursor-pointer ${
                  isPracticeActive
                    ? 'bg-[var(--app-muted-surface)] text-[#030302] font-semibold shadow-2xs'
                    : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]/60'
                }`}
              >
                <span>Luyện tập</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </span>
            }
          >
            <div className="flex flex-col gap-1 w-52 p-1">
              <NavLink
                to="/learn"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium rounded-[12px] transition-colors ${
                    isActive
                      ? 'bg-[var(--app-muted-surface)] text-[#030302] font-semibold'
                      : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]/70'
                  }`
                }
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-tertiary)]/60 text-[var(--app-secondary)]">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <span>Học cờ cơ bản</span>
              </NavLink>

              <NavLink
                to="/exercises"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium rounded-[12px] transition-colors ${
                    isActive
                      ? 'bg-[var(--app-muted-surface)] text-[#030302] font-semibold'
                      : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]/70'
                  }`
                }
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBF3F5] text-[var(--app-secondary)]">
                  <Brain className="h-3.5 w-3.5" />
                </div>
                <span>Bài tập chiến thuật</span>
              </NavLink>

              <NavLink
                to="/openings"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium rounded-[12px] transition-colors ${
                    isActive
                      ? 'bg-[var(--app-muted-surface)] text-[#030302] font-semibold'
                      : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]/70'
                  }`
                }
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-tertiary)]/70 text-[var(--app-secondary)]">
                  <Trophy className="h-3.5 w-3.5" />
                </div>
                <span>Kho Khai cuộc</span>
              </NavLink>
            </div>
          </AppPopover>

          <NavLink
            to="/training"
            className={({ isActive }) =>
              `px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--app-muted-surface)] text-[#030302] font-semibold shadow-2xs'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]/60'
              }`
            }
          >
            Tiến độ
          </NavLink>
        </nav>

        {/* Desktop Auth Section */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <AppMenu
              placement="bottom end"
              items={userMenuItems}
              trigger={
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--app-muted-surface)]/60 hover:bg-[var(--app-muted-surface)] cursor-pointer transition-colors border border-[var(--app-border)]">
                  <AppAvatar name={accountInitial} size="sm" />
                  <span className="text-xs font-medium text-[#030302] max-w-[120px] truncate">
                    {userEmail}
                  </span>
                  <ChevronDown className="h-3 w-3 text-[var(--app-subtle)]" />
                </div>
              }
            />
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

        {/* Mobile Menu Button */}
        <AppButton
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-full md:hidden"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-5 w-5 text-[#030302]" />
        </AppButton>
      </div>

      {/* Mobile Drawer Menu (HeroUI Drawer) */}
      <AppDrawer
        isOpen={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
        placement="right"
        title="Menu điều hướng"
        footer={
          isAuthenticated ? (
            <div className="w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <AppAvatar name={accountInitial} size="sm" />
                <span className="text-xs text-[var(--app-muted)] truncate max-w-[140px]">
                  {userEmail}
                </span>
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
            <div className="grid grid-cols-2 gap-2 w-full">
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
          )
        }
      >
        <div className="flex flex-col gap-2">
          <NavLink
            to="/"
            end
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-full transition-colors ${
                isActive
                  ? 'bg-[#030302] text-white'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]'
              }`
            }
          >
            Trang chủ
          </NavLink>

          <NavLink
            to="/play"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-full transition-colors ${
                isActive
                  ? 'bg-[#030302] text-white'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]'
              }`
            }
          >
            Chơi cờ
          </NavLink>

          <NavLink
            to="/learn"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-full transition-colors ${
                isActive
                  ? 'bg-[#030302] text-white'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]'
              }`
            }
          >
            Học cờ cơ bản
          </NavLink>

          <NavLink
            to="/exercises"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-full transition-colors ${
                isActive
                  ? 'bg-[#030302] text-white'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]'
              }`
            }
          >
            Bài tập chiến thuật
          </NavLink>

          <NavLink
            to="/openings"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-full transition-colors ${
                isActive
                  ? 'bg-[#030302] text-white'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]'
              }`
            }
          >
            Kho Khai cuộc
          </NavLink>

          <NavLink
            to="/training"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-full transition-colors ${
                isActive
                  ? 'bg-[#030302] text-white'
                  : 'text-[var(--app-muted)] hover:text-[#030302] hover:bg-[var(--app-muted-surface)]'
              }`
            }
          >
            Tiến độ & Huấn luyện
          </NavLink>
        </div>
      </AppDrawer>
    </header>
  );
}
