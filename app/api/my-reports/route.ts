/**
 * Route handler. Owner: B (backend).
 *
 * Thin on purpose — the logic lives in lib/api so it can be unit-tested without
 * a Next.js server, and so a route file never becomes the place a business rule
 * quietly hides.
 *
 *   GET /api/my-reports
 */
import { listMyReports } from '@/lib/api/reports';

export async function GET(request: Request) {
  return listMyReports(request);
}
