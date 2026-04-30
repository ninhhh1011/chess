const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

let supabase = null;

if (isSupabaseConfigured) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('[supabase] Cannot initialize client:', error);
  }
}

export default supabase;
