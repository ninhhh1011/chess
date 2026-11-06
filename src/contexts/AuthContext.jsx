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

    let active = true;
    let receivedAuthEvent = false;

    async function init() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (active && !receivedAuthEvent) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
        }
      } catch (error) {
        console.warn('[auth] Init error:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!active) return;
      receivedAuthEvent = true;
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setLoading(false);
    });

    init();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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

  const value = {
    user,
    session,
    loading,
    isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
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
