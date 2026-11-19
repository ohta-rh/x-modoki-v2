import { requestUpload } from '@/features/media-upload/index.server';

const STATUS = { UNAUTHORIZED: 401, VALIDATION: 400, RATE_LIMITED: 429 } as const;

/**
 * POST /api/uploads/presign — a signed URL to put one image (#25). A Route Handler, not a Server
 * Action: the image itself never passes through the app (ADR-0008).
 */
export async function postUploadPresign(request: Request): Promise<Response> {
  // T-11 (CSRF): only this site's own pages may ask; a browser's POST always carries its Origin.
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const result = await requestUpload(body);
  return result.ok
    ? Response.json({ id: result.id, url: result.url })
    : Response.json({ error: result.error }, { status: STATUS[result.error] });
}
