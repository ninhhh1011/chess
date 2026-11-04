import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signUpWithEmail } from '../services/authService';
import { AppButton } from '@/ui/AppButton';
import { AppField } from '@/ui/AppField';
import { AppCard } from '@/ui/AppCard';
import { ChessKnight } from 'lucide-react';

export default function Signup() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signUp, isSupabaseConfigured } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="grid place-items-center py-12 px-4 min-h-[70vh]">
        <AppCard className="w-full max-w-md p-8 sm:p-10 text-center space-y-6 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-modal)]">
          <AppCard.Header className="flex flex-col items-center space-y-3 p-0">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#030302] text-white shadow-xs">
              <ChessKnight className="h-7 w-7" />
            </div>
            <AppCard.Title className="font-serif text-3xl font-bold text-[#030302]">Đăng ký</AppCard.Title>
            <AppCard.Description className="text-xs sm:text-sm text-[var(--app-muted)] leading-relaxed">
              Tính năng đăng ký trực tuyến chưa được cấu hình trên môi trường này. Bạn vẫn có thể trải nghiệm toàn bộ tính năng và bài tập ngoại tuyến.
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

    const result = await signUpWithEmail({ email, password, displayName }, signUp);

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
      <AppCard className="w-full max-w-md p-8 sm:p-10 space-y-6 rounded-[28px] bg-white border border-[var(--app-border)] shadow-[var(--shadow-modal)]">
        <AppCard.Header className="flex flex-col items-center text-center space-y-2 p-0">
          <div className="flex h-13 w-13 items-center justify-center rounded-full bg-[#030302] text-white shadow-xs mb-2">
            <ChessKnight className="h-6 w-6" />
          </div>
          <AppCard.Title className="font-serif text-3xl font-bold text-[#030302]">Tạo tài khoản</AppCard.Title>
          <AppCard.Description className="text-xs sm:text-sm text-[var(--app-muted)]">
            Bắt đầu hành trình học cờ và theo dõi tiến độ
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
              type="text"
              label="Họ tên"
              value={displayName}
              onChange={(val) => setDisplayName(typeof val === 'string' ? val : val?.target?.value || '')}
              placeholder="Kỳ thủ"
              required
              disabled={loading}
            />

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
              placeholder="Ít nhất 6 ký tự"
              required
              disabled={loading}
            />

            <AppField
              type="password"
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(val) => setConfirmPassword(typeof val === 'string' ? val : val?.target?.value || '')}
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
                className="w-full font-semibold shadow-xs"
              >
                Đăng ký tài khoản
              </AppButton>
            </div>
          </form>
        </AppCard.Content>

        <AppCard.Footer className="p-0 pt-3 border-t border-[var(--app-border)] flex items-center justify-center text-xs text-[var(--app-muted)]">
          <span>Đã có tài khoản?</span>
          <AppButton
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
            className="text-[var(--app-secondary)] font-semibold hover:text-[var(--app-secondary-hover)] hover:bg-transparent h-auto py-0 px-1 ml-1"
          >
            Đăng nhập
          </AppButton>
        </AppCard.Footer>
      </AppCard>
    </div>
  );
}
