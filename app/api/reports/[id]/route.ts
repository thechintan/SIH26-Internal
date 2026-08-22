/**
 * Route handler. Owner: B (backend).
 *
 * Thin on purpose — the logic lives in lib/api so it can be unit-tested without
 * a Next.js server, and so a route file never becomes the place a business rule
 * quietly hides.
 *
 *   GET /api/reports/:id
 */
import { getReport } from '@/lib/api/reports';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return getReport(request, params.id);
}
