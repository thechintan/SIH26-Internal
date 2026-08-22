/**
 * Route handler. Owner: B (backend).
 *
 * Thin on purpose — the logic lives in lib/api so it can be unit-tested without
 * a Next.js server, and so a route file never becomes the place a business rule
 * quietly hides.
 *
 *   GET /api/incidents
 */
import { listIncidents } from '@/lib/api/incidents';

export async function GET(request: Request) {
  return listIncidents(request);
}
