import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsSupabaseConfigured } from '../contexts/AuthContext';
import { signUpWithEmail } from '../services/authService';

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
      <div className="min-h-screen grid place-items-center bg-ink/95 px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-gold to-amber-700 shadow-glow">
            <span className="text-5xl">♔</span>
          </div>
          <h1 className="text-4xl font-black text-cream">Đăng ký</h1>
          <p className="mt-4 text-lg text-cream/70">
            Tính năng đăng ký chưa được cấu hình. Vui lòng liên hệ quản trị viên để kích hoạt.
          </p>
          <button
            className="btn-primary mt-8"
            onClick={() => navigate('/')}
          >
            Quay về trang chủ
          </button>
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
    <div className="min-h-screen grid place-items-center bg-ink/95 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-gold to-amber-700 shadow-glow">
            <span className="text-3xl">♔</span>
          </div>
          <h1 className="text-3xl font-black text-cream">Tạo tài khoản</h1>
          <p className="mt-2 text-cream/60">Bắt đầu hành trình học cờ của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl bg-ink/60 p-6 backdrop-blur-xl border border-white/10">
          {error && (
            <div className="mb-4 rounded-xl bg-red/20 p-4 text-sm text-red/90">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold uppercase tracking-[0.18em] text-cream/45 mb-2">
                Họ tên
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 text-cream outline-none transition focus:border-gold"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-[0.18em] text-cream/45 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 text-cream outline-none transition focus:border-gold"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-[0.18em] text-cream/45 mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 text-cream outline-none transition focus:border-gold"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-[0.18em] text-cream/45 mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 text-cream outline-none transition focus:border-gold"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 w-full"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>

        <p className="mt-6 text-center text-cream/60">
          Đã có tài khoản?{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-bold text-gold hover:text-amber-400 transition"
          >
            Đăng nhập ngay
          </button>
        </p>
      </div>
    </div>
  );
}
