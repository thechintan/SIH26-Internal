/**
 * Response helpers shared by every route handler.
 *
 * Owner: B (backend). Every non-2xx body in this API is the ApiError shape from
 * lib/contracts/common.ts — one envelope, so A and D write one error path
 * instead of one per endpoint.
 */
import type { ZodError, ZodTypeAny, z } from 'zod';
import { ApiErrorSchema } from '../contracts/common';

type ErrorCode = z.infer<typeof ApiErrorSchema>['error']['code'];

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ILLEGAL_TRANSITION: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function ok<T>(body: T, status = 200): Response {
  return Response.json(body, { status });
}

export function fail(
  code: ErrorCode,
  message: string,
  extra?: { fields?: Record<string, string>; retry_after_s?: number },
): Response {
  const body = { error: { code, message, ...extra } };
  const headers: Record<string, string> = {};
  if (extra?.retry_after_s !== undefined) {
    headers['Retry-After'] = String(extra.retry_after_s);
  }
  return Response.json(body, { status: STATUS[code], headers });
}

/** Turns a Zod failure into field-keyed detail A can render next to each input. */
export function failValidation(error: ZodError): Response {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    fields[issue.path.join('.') || '_'] = issue.message;
  }
  return fail('VALIDATION_FAILED', 'Request failed validation', { fields });
}

/** Parse a JSON body against a schema. Returns either the value or a Response. */
export async function parseBody<T extends ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: fail('VALIDATION_FAILED', 'Body must be valid JSON') };
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? { data: parsed.data } : { response: failValidation(parsed.error) };
}

export function parseQuery<T extends ZodTypeAny>(
  request: Request,
  schema: T,
): { data: z.infer<T> } | { response: Response } {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  return parsed.success ? { data: parsed.data } : { response: failValidation(parsed.error) };
}

/**
 * Wraps a handler so an unexpected throw becomes a clean 500 instead of a Next.js
 * stack trace in the response body. The real error still reaches the logs.
 */
export function guarded(
  handler: (request: Request, ctx: { params: Record<string, string> }) => Promise<Response>,
) {
  return async (request: Request, ctx: { params: Record<string, string> }) => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      console.error('[api] unhandled:', err);
      return fail('INTERNAL', 'Something went wrong');
    }
  };
}
