/**
 * Browser Supabase client. Carries the signed-in citizen's session, so every
 * query runs under their own RLS policies.
 *
 * Owner: B (backend). Safe to import from a client component — this is the one
 * that is meant to be.
 *
 * A (citizen app) uses this for phone OTP:
 *
 *     const db = supabaseBrowser()
 *     await db.auth.signInWithOtp({ phone })
 *     await db.auth.verifyOtp({ phone, token, type: 'sms' })
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
      // The OTP link path never runs in this app; sessions come from verifyOtp.
      detectSessionInUrl: false,
    },
  });
  return cached;
}
