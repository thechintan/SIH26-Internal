/**
 * Request-scoped Supabase client — runs as the caller, under their own RLS
 * policies.
 *
 * Owner: B (backend). This is the default for route handlers. The service-role
 * client in admin.ts is the exception, not the norm.
 *
 * Deliberately decoupled from `next/headers`: it takes a plain `Request`, which
 * means route handlers, the cron and unit tests all use the same code path, and
 * this file typechecks without the Next.js runtime.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './env';
import { supabaseAdmin } from './admin';
import type { Role } from '../contracts/enums';

/** Reads the bearer token the Supabase JS client sends on every request. */
export function accessTokenFrom(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * A client that acts as the caller. Anon key plus their JWT: PostgREST resolves
 * auth.uid() from the token, so every policy in 0002_rls.sql applies exactly as
 * written.
 */
export function supabaseForToken(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export type Caller = {
  userId: string;
  role: Role;
  department: string | null;
  /** Scoped to this caller. Use it for anything RLS can express. */
  db: SupabaseClient;
};

/**
 * Resolves the caller, or null when the request is anonymous or the token is
 * expired. Route handlers turn null into a 401 with the shared ApiError shape.
 *
 * The role lookup goes through the service-role client on purpose: the users
 * table is itself protected by RLS, and reading a row to find out what someone
 * is allowed to read is the one place that would deadlock on its own policy.
 */
export async function getCaller(request: Request): Promise<Caller | null> {
  const token = accessTokenFrom(request);
  if (!token) return null;

  const db = supabaseForToken(token);
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabaseAdmin()
    .from('users')
    .select('role, department')
    .eq('id', data.user.id)
    .maybeSingle();

  return {
    userId: data.user.id,
    role: (profile?.role as Role) ?? 'CITIZEN',
    department: (profile?.department as string | null) ?? null,
    db,
  };
}

export function isStaff(caller: Caller): boolean {
  return caller.role === 'FIELD_STAFF' || caller.role === 'DEPT_HEAD' || caller.role === 'SUPER_ADMIN';
}

export function isAdmin(caller: Caller): boolean {
  return caller.role === 'DEPT_HEAD' || caller.role === 'SUPER_ADMIN';
}
