import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsSupabaseConfigured } from '../contexts/AuthContext';
import { signUpWithEmail } from '../services/authService';
import { AppButton } from '@/ui/AppButton';
import { AppField } from '@/ui/AppField';
import { ChessKnight } from 'lucide-react';

export default function Signup() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const isSupabaseConfigured = useIsSupabaseConfigured();

  if (!isSupabaseConfigured) {
    return (
      <div className="grid place-items-center py-12 px-4 min-h-[70vh]">
        <div className="w-full max-w-md rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center space-y-6 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[var(--app-surface-raised)] border border-[var(--app-border)] text-[var(--app-accent)]">
            <ChessKnight className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--app-foreground)]">Đăng ký</h1>
            <p className="text-xs text-[var(--app-muted)] leading-relaxed">
              Tính năng đăng ký trực tuyến chưa được cấu hình trên môi trường này. Bạn vẫn có thể trải nghiệm toàn bộ tính năng và bài tập ngoại tuyến.
            </p>
          </div>
          <AppButton variant="secondary" onClick={() => navigate('/')} className="w-full">
            Quay về trang chủ
          </AppButton>
        </div>
      </div>
    );
  }

  function validateForm() {
    if (!displayName.trim()) {
      return 'Vui lòng nhập họ tên.';
    }
    if (!email || !email.includes('@')) {
      return 'Email không hợp lệ.';
    }
    if (!password || password.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    if (password !== confirmPassword) {
      return 'Mật khẩu xác nhận không khớp.';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const result = await signUpWithEmail({ email, password, displayName });

    if (result.success) {
      navigate('/login', {
        state: { message: result.message || 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.' },
      });
    } else {
      setError(result.error || 'Đăng ký thất bại. Vui lòng thử lại.');
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
          <h1 className="text-2xl font-bold text-[var(--app-foreground)]">Tạo tài khoản</h1>
          <p className="text-xs text-[var(--app-muted)]">Bắt đầu hành trình học cờ và theo dõi tiến độ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="rounded-[8px] border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 p-3 text-xs text-[var(--app-danger)] font-medium">
              {error}
            </div>
          )}

          <AppField
            type="text"
            label="Họ tên"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Kỳ thủ"
            required
            disabled={loading}
          />

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
            placeholder="Ít nhất 6 ký tự"
            required
            disabled={loading}
          />

          <AppField
            type="password"
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
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
              Đăng ký
            </AppButton>
          </div>
        </form>

        <div className="pt-2 border-t border-[var(--app-border)] text-center text-xs text-[var(--app-muted)]">
          <span>Đã có tài khoản? </span>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[var(--app-accent)] font-semibold hover:underline ml-1 cursor-pointer"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
