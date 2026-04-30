import { createContext, useContext, useEffect, useState } from 'react';
import supabase, { isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    async function init() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user || null);
      } catch (error) {
        console.warn('[auth] Init error:', error);
      } finally {
        setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async ({ email, password, displayName }) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase chưa được cấu hình') };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      return { data, error };
    } catch (err) {
      return { error: err };
    }
  };

  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase chưa được cấu hình') };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase chưa được cấu hình') };
    }
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      return { error: err };
    }
  };

  const refreshUser = async () => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.warn('[auth] Refresh user error:', error);
      return null;
    }
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useIsSupabaseConfigured() {
  return isSupabaseConfigured;
}
