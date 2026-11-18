'use server';

import { z } from 'zod';
import { parseId } from '@/shared/lib/id';
import type { MediaItem } from './create-post';
import { createPost } from './create-post';

import type { CreatePostActionResult } from '../model/types';

export type { CreatePostActionResult };

const MESSAGES = {
  UNAUTHORIZED: 'ログインしてください',
  VALIDATION: '本文を確かめてください',
  RATE_LIMITED: '投稿が多すぎます。しばらく待ってから、もう一度お試しください',
  NOT_FOUND: 'この投稿は見つかりません',
} as const;

const mediaSchema = z
  .array(z.object({ id: z.string(), alt: z.string() }))
  .max(4)
  .transform((items, context): MediaItem[] =>
    items.map((item) => {
      const id = parseId(item.id);
      if (id === null) context.addIssue({ code: 'custom', message: 'id' });
      return { id: id ?? 0n, alt: item.alt };
    }),
  );

/** Posts `text` with up to four uploaded images (#19, #25). */
export async function createPostAction(
  text: string,
  media: { id: string; alt: string }[] = [],
): Promise<CreatePostActionResult> {
  const parsed = z.tuple([z.string(), mediaSchema]).safeParse([text, media]);
  if (!parsed.success) return { ok: false, message: MESSAGES.VALIDATION };
  const [body, items] = parsed.data;
  const result = await createPost(body, { media: items });
  return result.ok ? { ok: true, id: result.id } : { ok: false, message: MESSAGES[result.error] };
}

export async function createReplyAction(
  text: string,
  replyToId: string,
): Promise<CreatePostActionResult> {
  const parsed = z.string().safeParse(text);
  if (!parsed.success) return { ok: false, message: MESSAGES.VALIDATION };
  const parentId = parseId(String(replyToId));
  if (parentId === null) return { ok: false, message: MESSAGES.NOT_FOUND };
  const result = await createPost(parsed.data, { replyToId: parentId });
  return result.ok ? { ok: true, id: result.id } : { ok: false, message: MESSAGES[result.error] };
}

/** Posts `text` quoting another post (#22). */
export async function createQuoteAction(
  text: string,
  quoteOfId: string,
): Promise<CreatePostActionResult> {
  const parsed = z.string().safeParse(text);
  if (!parsed.success) return { ok: false, message: MESSAGES.VALIDATION };
  const targetId = parseId(String(quoteOfId));
  if (targetId === null) return { ok: false, message: MESSAGES.NOT_FOUND };
  const result = await createPost(parsed.data, { quoteOfId: targetId });
  return result.ok ? { ok: true, id: result.id } : { ok: false, message: MESSAGES[result.error] };
}
