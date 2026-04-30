import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export function signUpWithEmail({ email, password, displayName }) {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Tính năng đăng ký chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
    };
  }

  if (!email || !email.includes('@')) {
    return {
      success: false,
      error: 'Email không hợp lệ. Vui lòng kiểm tra lại.',
    };
  }

  if (!password || password.length < 6) {
    return {
      success: false,
      error: 'Mật khẩu phải có ít nhất 6 ký tự.',
    };
  }

  const { signUp } = useAuth();
  const { data, error } = signUp({ email, password, displayName });

  if (error) {
    const message = error.message || 'Đăng ký thất bại. Vui lòng thử lại.';
    return { success: false, error: message };
  }

  if (data.user) {
    return {
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.',
      user: data.user,
    };
  }

  return {
    success: true,
    message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.',
  };
}

export function signInWithEmail({ email, password }) {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Tính năng đăng nhập chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
    };
  }

  if (!email || !email.includes('@')) {
    return {
      success: false,
      error: 'Email không hợp lệ. Vui lòng kiểm tra lại.',
    };
  }

  if (!password) {
    return {
      success: false,
      error: 'Vui lòng nhập mật khẩu.',
    };
  }

  const { signIn } = useAuth();
  const { data, error } = signIn({ email, password });

  if (error) {
    const message = error.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
    return { success: false, error: message };
  }

  if (data.user) {
    return {
      success: true,
      message: 'Đăng nhập thành công!',
      user: data.user,
    };
  }

  return {
    success: false,
    error: 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
  };
}

export function signOutUser() {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Tính năng đăng xuất chưa được cấu hình.',
    };
  }

  const { signOut } = useAuth();
  const { error } = signOut();

  if (error) {
    return {
      success: false,
      error: error.message || 'Đăng xuất thất bại. Vui lòng thử lại.',
    };
  }

  return {
    success: true,
    message: 'Đăng xuất thành công!',
  };
}

export function getCurrentSession() {
  if (!isSupabaseConfigured) return null;
  const { session } = useAuth();
  return session;
}

export function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}
