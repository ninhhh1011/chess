import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useIsSupabaseConfigured } from '../contexts/AuthContext';
import { signInWithEmail } from '../services/authService';
import { AppButton } from '@/ui/AppButton';
import { AppField } from '@/ui/AppField';
import { ChessKnight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isSupabaseConfigured = useIsSupabaseConfigured();

  const from = location.state?.from?.pathname || '/training';

  if (isAuthenticated) {
    navigate(from);
    return null;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="grid place-items-center py-12 px-4 min-h-[70vh]">
        <div className="w-full max-w-md rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center space-y-6 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-[var(--app-accent)]">
            <ChessKnight className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--app-foreground)]">Đăng nhập</h1>
            <p className="text-xs text-[var(--app-muted)] leading-relaxed">
              Tính năng xác thực trực tuyến chưa được cấu hình trên môi trường này. Tiến độ của bạn vẫn được lưu trữ cục bộ trên trình duyệt.
            </p>
          </div>
          <AppButton variant="secondary" onClick={() => navigate('/')} className="w-full">
            Quay về trang chủ
          </AppButton>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signInWithEmail({ email, password });

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }

    setLoading(false);
  }

  return (
    <div className="grid place-items-center py-8 px-4 min-h-[75vh]">
      <div className="w-full max-w-md rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--app-accent)] text-[#0C100E] shadow-sm">
            <ChessKnight className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--app-foreground)]">Đăng nhập</h1>
          <p className="text-xs text-[var(--app-muted)]">Đăng nhập để đồng bộ tiến độ và bài tập</p>
        </div>

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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            disabled={loading}
          />

          <AppField
            type="password"
            label="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <div className="pt-2 border-t border-[var(--app-border)] text-center text-xs text-[var(--app-muted)]">
          <span>Chưa có tài khoản? </span>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="text-[var(--app-accent)] font-semibold hover:underline ml-1 cursor-pointer"
          >
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
}
