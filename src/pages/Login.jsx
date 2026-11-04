import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithEmail } from '../services/authService';
import { AppButton } from '@/ui/AppButton';
import { AppField } from '@/ui/AppField';
import { AppCard } from '@/ui/AppCard';
import { ChessKnight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, isSupabaseConfigured } = useAuth();
  const isAuthenticated = Boolean(user);

  const from = location.state?.from?.pathname || '/training';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [from, isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  if (!isSupabaseConfigured) {
    return (
      <div className="grid place-items-center py-12 px-4 min-h-[70vh]">
        <AppCard className="w-full max-w-md p-8 sm:p-10 text-center space-y-6 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-modal)]">
          <AppCard.Header className="flex flex-col items-center space-y-3 p-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#030302] text-white shadow-xs">
              <ChessKnight className="h-7 w-7" />
            </div>
            <AppCard.Title className="font-serif text-3xl font-bold text-[#030302]">Đăng nhập</AppCard.Title>
            <AppCard.Description className="text-xs sm:text-sm text-[var(--app-muted)] leading-relaxed">
              Tính năng xác thực trực tuyến chưa được cấu hình trên môi trường này. Tiến độ của bạn vẫn được lưu trữ cục bộ trên trình duyệt.
            </AppCard.Description>
          </AppCard.Header>
          <AppCard.Content className="p-0">
            <AppButton variant="secondary" onClick={() => navigate('/')} className="w-full">
              Quay về trang chủ
            </AppButton>
          </AppCard.Content>
        </AppCard>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signInWithEmail({ email, password }, signIn);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }

    setLoading(false);
  }

  return (
    <div className="grid place-items-center py-8 px-4 min-h-[75vh]">
      <AppCard className="w-full max-w-md p-8 sm:p-10 space-y-6 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-modal)]">
        <AppCard.Header className="flex flex-col items-center text-center space-y-2 p-0">
          <div className="flex h-13 w-13 items-center justify-center rounded-full bg-[#030302] text-white shadow-xs mb-2">
            <ChessKnight className="h-6 w-6" />
          </div>
          <AppCard.Title className="font-serif text-3xl font-bold text-[#030302]">Đăng nhập</AppCard.Title>
          <AppCard.Description className="text-xs sm:text-sm text-[var(--app-muted)]">
            Đăng nhập để đồng bộ tiến độ và bài tập
          </AppCard.Description>
        </AppCard.Header>

        <AppCard.Content className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[14px] border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 p-3.5 text-xs text-[var(--app-danger)] font-medium">
                {error}
              </div>
            )}

            <AppField
              type="email"
              label="Email"
              value={email}
              onChange={(val) => setEmail(typeof val === 'string' ? val : val?.target?.value || '')}
              placeholder="email@example.com"
              required
              disabled={loading}
            />

            <AppField
              type="password"
              label="Mật khẩu"
              value={password}
              onChange={(val) => setPassword(typeof val === 'string' ? val : val?.target?.value || '')}
              placeholder="••••••••"
              required
              disabled={loading}
            />

            <div className="pt-2">
              <AppButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                isLoading={loading}
                className="w-full font-semibold shadow-xs"
              >
                Đăng nhập
              </AppButton>
            </div>
          </form>
        </AppCard.Content>

        <AppCard.Footer className="p-0 pt-3 border-t border-[var(--app-border)] flex items-center justify-center text-xs text-[var(--app-muted)]">
          <span>Chưa có tài khoản?</span>
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => navigate('/signup')}
            className="text-[var(--app-secondary)] font-semibold hover:text-[var(--app-secondary-hover)] hover:bg-transparent h-auto py-0 px-1 ml-1"
          >
            Đăng ký ngay
          </AppButton>
        </AppCard.Footer>
      </AppCard>
    </div>
  );
}
