import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useIsSupabaseConfigured } from '../contexts/AuthContext';
import { signInWithEmail } from '../services/authService';

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
      <div className="min-h-screen grid place-items-center bg-ink/95 px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-gold to-amber-700 shadow-glow">
            <span className="text-5xl">♔</span>
          </div>
          <h1 className="text-4xl font-black text-cream">Đăng nhập</h1>
          <p className="mt-4 text-lg text-cream/70">
            Tính năng đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên để kích hoạt.
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signInWithEmail({ email, password });

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Đăng nhập thất bại. Vui lòng thử lại.');
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
          <h1 className="text-3xl font-black text-cream">Đăng nhập</h1>
          <p className="mt-2 text-cream/60">Vào tài khoản để đồng bộ tiến độ</p>
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 w-full"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-6 text-center text-cream/60">
          Chưa có tài khoản?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="font-bold text-gold hover:text-amber-400 transition"
          >
            Đăng ký ngay
          </button>
        </p>
      </div>
    </div>
  );
}
