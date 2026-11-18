import { requestUpload } from '@/features/media-upload/index.server';

const STATUS = { UNAUTHORIZED: 401, VALIDATION: 400, RATE_LIMITED: 429 } as const;

/**
 * POST /api/uploads/presign — a signed URL to put one image (#25). A Route Handler, not a Server
 * Action: the image itself never passes through the app (ADR-0008).
 */
export async function postUploadPresign(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const result = await requestUpload(body);
  return result.ok
    ? Response.json({ id: result.id, url: result.url })
    : Response.json({ error: result.error }, { status: STATUS[result.error] });
}
