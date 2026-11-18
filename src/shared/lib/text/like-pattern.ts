/**
 * An ILIKE pattern that finds `q` anywhere (#27): `%`, `_` and `\` in `q` are taken as they are,
 * not as wildcards. Use it with `ESCAPE '\'`.
 */
export const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
