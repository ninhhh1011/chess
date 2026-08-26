import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useIsSupabaseConfigured } from '../contexts/AuthContext';
import { signInWithEmail } from '../services/authService';
import { Input } from '@/design-system/primitives/Input';
import { Button } from '@/design-system/primitives/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/design-system/primitives/Card';

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
      <div className="min-h-screen grid place-items-center bg-bg-base px-4">
        <Card variant="elevated" className="max-w-md text-center">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm">
            <span className="text-5xl">♔</span>
          </div>
          <CardHeader className="mb-0">
            <CardTitle as="h1">Đăng nhập</CardTitle>
            <CardDescription>
              Tính năng đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên để kích hoạt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>
              Quay về trang chủ
            </Button>
          </CardContent>
        </Card>
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
    <div className="min-h-screen grid place-items-center bg-bg-base px-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm">
            <span className="text-3xl">♔</span>
          </div>
          <CardTitle as="h1">Đăng nhập</CardTitle>
          <CardDescription>Vào tài khoản để đồng bộ tiến độ</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-error/20 p-4 text-sm text-error">
                {error}
              </div>
            )}

            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />

            <Input
              type="password"
              label="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              className="w-full mt-6"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          <p className="mt-6 text-center text-text-secondary">
            Chưa có tài khoản?{' '}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/signup')}
              className="inline ml-1"
            >
              Đăng ký ngay
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
