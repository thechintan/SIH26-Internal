/**
 * Vercel Cron — rescore all open incidents.
 *
 * Runs every 5 minutes. Reads open incidents from Supabase, computes priority
 * via C's engine, and writes `priority_score` + `priority_breakdown` back.
 *
 * Owner: C (engine) — the logic is in `lib/engine/rescore.ts`.
 * Route wiring follows B's pattern: thin route, logic elsewhere.
 *
 *   GET /api/cron/rescore
 *
 * Protected by CRON_SECRET — Vercel sends this header automatically on cron
 * invocations. Without it, anyone could trigger a full rescore by hitting the
 * URL.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rescoreAllIncidents } from '@/lib/engine';

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. If the env var is
 * not set (local dev), skip the check so `curl localhost:3000/api/cron/rescore`
 * works during development.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // local dev — no secret configured
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = supabaseAdmin();
    const result = await rescoreAllIncidents(db);

    console.log(
      `[cron/rescore] done: ${result.scored} scored, ${result.skipped} skipped, ` +
        `${result.errors} errors, ${result.durationMs}ms`,
    );

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error('[cron/rescore] fatal:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
