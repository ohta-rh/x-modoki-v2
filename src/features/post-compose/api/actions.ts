'use server';

import { z } from 'zod';
import { parseId } from '@/shared/lib/id';
import { createPost } from './create-post';

import type { CreatePostActionResult } from '../model/types';

export type { CreatePostActionResult };

const MESSAGES = {
  UNAUTHORIZED: 'ログインしてください',
  VALIDATION: '本文を確かめてください',
  RATE_LIMITED: '投稿が多すぎます。しばらく待ってから、もう一度お試しください',
  NOT_FOUND: 'この投稿は見つかりません',
} as const;

export async function createPostAction(text: string): Promise<CreatePostActionResult> {
  const parsed = z.string().safeParse(text);
  if (!parsed.success) return { ok: false, message: MESSAGES.VALIDATION };
  const result = await createPost(parsed.data);
  return result.ok ? { ok: true } : { ok: false, message: MESSAGES[result.error] };
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
  return result.ok ? { ok: true } : { ok: false, message: MESSAGES[result.error] };
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
  return result.ok ? { ok: true } : { ok: false, message: MESSAGES[result.error] };
}
