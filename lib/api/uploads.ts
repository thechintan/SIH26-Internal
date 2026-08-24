/**
 * Presigned upload URLs.
 *
 * Owner: B (backend). POST /api/uploads
 *
 * The browser PUTs the file straight to Supabase Storage. It never passes
 * through a route handler: a serverless body limit would cap photo size, and
 * proxying the bytes would burn the whole upload window on a bad connection —
 * which, on a phone in a city, is the normal case.
 */
import {
  ALLOWED_IMAGE_TYPES,
  CreateUploadUrlRequestSchema,
  type CreateUploadUrlResponse,
} from '../contracts/upload';
import { supabaseAdmin } from '../supabase/admin';
import { getCaller } from '../supabase/request';
import { fail, ok, parseBody } from './respond';

/** Private buckets. Reports carry a face, a doorstep and a home address often enough. */
export const BUCKET = {
  REPORT_PHOTO: 'report-photos',
  RESOLUTION_PHOTO: 'resolution-photos',
  VOICE_NOTE: 'voice-notes',
} as const;

const URL_TTL_SECONDS = 15 * 60;

/**
 * Convert a private storage path (e.g. `report-photos/uid/date/uuid.jpg`)
 * into a short-lived signed read URL that any authenticated viewer's browser
 * can actually load in an <img>.
 *
 * Returns null when the path is null/empty or when Supabase errors — callers
 * should treat null as "no photo available" rather than propagating the error.
 *
 * The TTL is intentionally short (15 min): signed read URLs are forwarded to
 * a browser and caching is the browser's job, not ours.
 */
export async function resolveStorageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;

  // Determine which bucket owns this path from its prefix (the first segment).
  const segments = path.split('/');
  const bucketName = segments[0];
  const objectPath = segments.slice(1).join('/');

  // Gracefully skip paths that don't match any known bucket (e.g. mock paths
  // that slipped through, legacy absolute URLs, or data: URIs).
  if (!objectPath || !Object.values(BUCKET).includes(bucketName as never)) {
    // If it already looks like a URL (http/https or data:), return as-is.
    if (/^(https?:|data:)/.test(path)) return path;
    return null;
  }

  const { data, error } = await supabaseAdmin()
    .storage.from(bucketName)
    .createSignedUrl(objectPath, URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error('[api] resolveStorageUrl failed:', error);
    return null;
  }
  return data.signedUrl;
}

export async function createUploadUrl(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return fail('UNAUTHORIZED', 'Sign in to upload');

  const parsed = await parseBody(request, CreateUploadUrlRequestSchema);
  if ('response' in parsed) return parsed.response;
  const { kind, content_type, size_bytes } = parsed.data;

  if (kind !== 'VOICE_NOTE' && !ALLOWED_IMAGE_TYPES.includes(content_type as never)) {
    return fail('VALIDATION_FAILED', 'Photos must be JPEG, PNG or WebP', {
      fields: { content_type: `Unsupported type ${content_type}` },
    });
  }

  // Only field staff close out work, so only they may stage a resolution photo.
  if (kind === 'RESOLUTION_PHOTO' && caller.role === 'CITIZEN') {
    return fail('FORBIDDEN', 'Only assigned staff can upload a resolution photo');
  }

  const extension = content_type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
  // Namespaced by user so one citizen can never overwrite another's photo by
  // guessing a path, and dated so the bucket stays browsable during the demo.
  const day = new Date().toISOString().slice(0, 10);
  const path = `${caller.userId}/${day}/${crypto.randomUUID()}.${extension}`;

  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET[kind])
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error('[api] presign failed:', error);
    return fail('INTERNAL', 'Could not prepare the upload');
  }

  const response: CreateUploadUrlResponse = {
    upload_url: data.signedUrl,
    // The storage path, not a public URL — the bucket stays private and B
    // resolves a signed read URL when someone is actually allowed to see it.
    path: `${BUCKET[kind]}/${path}`,
    expires_at: new Date(Date.now() + URL_TTL_SECONDS * 1000).toISOString(),
  };
  // size_bytes is validated by the contract (≤5MB) and enforced again by the
  // bucket's own file size limit, which is the one a client cannot lie about.
  void size_bytes;
  return ok(response, 201);
}
