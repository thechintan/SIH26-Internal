/**
 * Route handler. Owner: B (backend).
 *
 * Thin on purpose — the logic lives in lib/api so it can be unit-tested without
 * a Next.js server, and so a route file never becomes the place a business rule
 * quietly hides.
 *
 *   POST /api/reports/:id/verify
 */
import { verifyReport } from '@/lib/api/reports';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return verifyReport(request, params.id);
}
