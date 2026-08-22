/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * Owner: B (backend). Server-side only — route handlers, the rescoring cron,
 * scripts. Never import this from a client component.
 *
 * Use it only where RLS genuinely cannot express the operation:
 *   - clustering, which writes `incidents` and `incident_reporters` on behalf of
 *     a citizen who is not allowed to write either table directly
 *   - the rescoring cron, which runs with no user session at all
 *   - the seed script
 *
 * Everywhere else, use the request-scoped client so the caller's own policies
 * apply. Reaching for the service role because a query returned nothing is how
 * an authorization bug gets buried instead of fixed.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseServiceKey, supabaseUrl } from './env';

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: {
      // No session to persist and nothing to refresh: this client is not a user.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
