/**
 * Presigned upload contract.
 *
 * The browser uploads the photo directly to Supabase Storage. The file never
 * passes through a Next.js route — a serverless function body limit would cap
 * the photo size and burn the whole upload window on a bad connection.
 *
 * PRD §2: there is no true background upload on the web. The tab must stay open,
 * so A shows a real progress bar against this URL and keeps the citizen on-screen
 * until it completes.
 *
 * Endpoint: POST /api/uploads
 * Owner: E (integration). Consumers: A (citizen app), D (field resolution photo), B (API).
 */
import { z } from 'zod';
import { TimestampSchema } from './common';

export const UPLOAD_KINDS = ['REPORT_PHOTO', 'RESOLUTION_PHOTO', 'VOICE_NOTE'] as const;
export const UploadKindSchema = z.enum(UPLOAD_KINDS);
export type UploadKind = z.infer<typeof UploadKindSchema>;

/** Client-side compression targets ≤500KB (PRD §9.3); this is the hard ceiling. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const CreateUploadUrlRequestSchema = z.object({
  kind: UploadKindSchema,
  content_type: z.string().min(1),
  size_bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export type CreateUploadUrlRequest = z.infer<typeof CreateUploadUrlRequestSchema>;

export const CreateUploadUrlResponseSchema = z.object({
  /** PUT the file here. Short-lived. */
  upload_url: z.string().url(),

  /**
   * The storage path to send back in the report body as `photo_url`. Not the
   * public URL — B resolves that server-side so the bucket can stay private.
   */
  path: z.string().min(1),

  expires_at: TimestampSchema,
});
export type CreateUploadUrlResponse = z.infer<typeof CreateUploadUrlResponseSchema>;
