/**
 * Route handler. Owner: B (backend).
 *
 * Thin on purpose — the logic lives in lib/api so it can be unit-tested without
 * a Next.js server, and so a route file never becomes the place a business rule
 * quietly hides.
 *
 *   GET   /api/incidents/:id
 *   PATCH /api/incidents/:id
 */
import { getIncident, updateIncident } from '@/lib/api/incidents';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return getIncident(request, params.id);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return updateIncident(request, params.id);
}
