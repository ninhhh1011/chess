import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useIsSupabaseConfigured } from '../contexts/AuthContext';
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
  const { isAuthenticated, signIn } = useAuth();
  const isSupabaseConfigured = useIsSupabaseConfigured();

  const from = location.state?.from?.pathname || '/training';

  if (isAuthenticated) {
    navigate(from);
    return null;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="grid place-items-center py-12 px-4 min-h-[70vh]">
        <AppCard className="w-full max-w-md p-8 text-center space-y-6">
          <AppCard.Header className="flex flex-col items-center space-y-3 p-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-accent)]">
              <ChessKnight className="h-7 w-7" />
            </div>
            <AppCard.Title className="text-2xl font-bold text-[var(--app-foreground)]">Đăng nhập</AppCard.Title>
            <AppCard.Description className="text-xs text-[var(--app-muted)] leading-relaxed">
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
      <AppCard className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <AppCard.Header className="flex flex-col items-center text-center space-y-2 p-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--app-accent)] text-[#0C100E] shadow-sm">
            <ChessKnight className="h-6 w-6" />
          </div>
          <AppCard.Title className="text-2xl font-bold text-[var(--app-foreground)]">Đăng nhập</AppCard.Title>
          <AppCard.Description className="text-xs text-[var(--app-muted)]">
            Đăng nhập để đồng bộ tiến độ và bài tập
          </AppCard.Description>
        </AppCard.Header>

        <AppCard.Content className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[8px] border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 p-3 text-xs text-[var(--app-danger)] font-medium">
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
                className="w-full font-bold"
              >
                Đăng nhập
              </AppButton>
            </div>
          </form>
        </AppCard.Content>

        <AppCard.Footer className="p-0 pt-2 border-t border-[var(--app-border)] flex items-center justify-center text-xs text-[var(--app-muted)]">
          <span>Chưa có tài khoản?</span>
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => navigate('/signup')}
            className="text-[var(--app-accent)] font-semibold hover:text-[var(--app-accent-hover)] hover:bg-transparent h-auto py-0 px-1 ml-1"
          >
            Đăng ký ngay
          </AppButton>
        </AppCard.Footer>
      </AppCard>
    </div>
  );
}
