/**
 * Supabase environment, read once and validated loudly.
 *
 * Owner: B (backend).
 *
 * A missing env var should fail at the first call with a sentence that says what
 * to do, not three layers down as "Invalid URL" or a 401 from PostgREST that
 * looks like an auth bug.
 */

/** Public project URL. Safe in the browser. */
export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local — the value is ' +
        'on the Supabase dashboard under Project Settings → API.',
    );
  }
  return url;
}

/**
 * Anon key. Safe to expose: it is the key the browser uses, and Row Level
 * Security is what actually protects the data behind it. If something is
 * readable with this key that should not be, the bug is in 0002_rls.sql.
 */
export function supabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Add it to .env.local.',
    );
  }
  return key;
}

/**
 * Service role key. Bypasses RLS entirely.
 *
 * Server-side only — route handlers, the cron, the seed script. The guard below
 * is not paranoia: a service-role client imported into a client component gets
 * bundled and shipped to every visitor, which hands anyone who opens devtools
 * full read and write on the whole database.
 */
export function supabaseServiceKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error(
      'The service role key was reached from browser code. It bypasses RLS and ' +
        'must never be bundled. Use lib/supabase/client.ts in a client component.',
    );
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (and to the ' +
        'Vercel project env vars for deploys). Never prefix it with NEXT_PUBLIC_.',
    );
  }
  return key;
}
