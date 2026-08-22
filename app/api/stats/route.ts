/**
 * Route handler. Owner: B (backend).
 *
 * Thin on purpose — the logic lives in lib/api so it can be unit-tested without
 * a Next.js server, and so a route file never becomes the place a business rule
 * quietly hides.
 *
 *   GET /api/stats — public, no auth
 */
import { getPublicStats } from '@/lib/api/incidents';

// Counters move constantly; a cached landing page number looks broken.
export const dynamic = 'force-dynamic';

export async function GET() {
  return getPublicStats();
}
