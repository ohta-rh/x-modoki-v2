/**
 * The client's IP for rate limits. On Cloudflare (Milestone 2) cf-connecting-ip is set by the edge
 * and cannot be forged; locally the first x-forwarded-for entry stands in.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
