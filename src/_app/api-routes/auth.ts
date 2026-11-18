import { getAuth } from '@/shared/auth/index.server';

/** Better Auth's own endpoints under /api/auth/* (ADR-0007). */
export async function authHandler(request: Request): Promise<Response> {
  return getAuth().handler(request);
}
