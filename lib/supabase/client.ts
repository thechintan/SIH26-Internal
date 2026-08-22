/**
 * Browser Supabase client. Carries the signed-in citizen's session, so every
 * query runs under their own RLS policies.
 *
 * Owner: B (backend). Safe to import from a client component — this is the one
 * that is meant to be.
 *
 * Auth is email + password for everyone; decisions/005 dropped phone OTP:
 *
 *     const db = supabaseBrowser()
 *     await db.auth.signUp({ email, password })          // Step 6 sign-up
 *     await db.auth.signInWithPassword({ email, password }) // returning citizen
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './env';

let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // No magic-link / OAuth callback flow — sessions come from
      // signInWithPassword directly, so URL detection is unused work.
      detectSessionInUrl: false,
    },
  });
  return cached;
}
