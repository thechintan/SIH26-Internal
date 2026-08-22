/**
 * Route handler. Owner: B (backend).
 *
 * Thin on purpose — the logic lives in lib/api so it can be unit-tested without
 * a Next.js server, and so a route file never becomes the place a business rule
 * quietly hides.
 *
 *   POST /api/uploads
 */
import { createUploadUrl } from '@/lib/api/uploads';

export async function POST(request: Request) {
  return createUploadUrl(request);
}
