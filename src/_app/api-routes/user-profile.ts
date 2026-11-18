import { getProfile } from '@/entities/user/index.server';

type Context = { params: Promise<{ username: string }> };

/** GET /api/users/{username} — a profile, for the hover card (#23). */
export async function getUserProfile(_request: Request, { params }: Context): Promise<Response> {
  const result = await getProfile((await params).username);
  return result.ok
    ? Response.json(result.profile)
    : Response.json({ error: result.error }, { status: 404 });
}
