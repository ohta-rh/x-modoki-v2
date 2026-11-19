import { requestUpload } from '@/features/media-upload/index.server';

const STATUS = { UNAUTHORIZED: 401, VALIDATION: 400, RATE_LIMITED: 429 } as const;

/**
 * T-11 (CSRF): only this site's own pages may ask. A browser's POST always carries its Origin; it
 * must name the host the request reached, as Next.js checks for Server Actions. Not request.url:
 * next start builds it from the name it listens on, so a page opened at 127.0.0.1 would be refused.
 */
function fromThisSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin === null || !URL.canParse(origin)) return false;
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host;
  return new URL(origin).host === host;
}

/**
 * POST /api/uploads/presign — a signed URL to put one image (#25). A Route Handler, not a Server
 * Action: the image itself never passes through the app (ADR-0008).
 */
export async function postUploadPresign(request: Request): Promise<Response> {
  if (!fromThisSite(request)) return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const result = await requestUpload(body);
  return result.ok
    ? Response.json({ id: result.id, url: result.url })
    : Response.json({ error: result.error }, { status: STATUS[result.error] });
}
