'use server';

import { z } from 'zod';
import { createPost } from './create-post';

import type { CreatePostActionResult } from '../model/types';

export type { CreatePostActionResult };

const MESSAGES = {
  UNAUTHORIZED: 'ログインしてください',
  VALIDATION: '本文を確かめてください',
  RATE_LIMITED: '投稿が多すぎます。しばらく待ってから、もう一度お試しください',
} as const;

export async function createPostAction(text: string): Promise<CreatePostActionResult> {
  const parsed = z.string().safeParse(text);
  if (!parsed.success) return { ok: false, message: MESSAGES.VALIDATION };
  const result = await createPost(parsed.data);
  return result.ok ? { ok: true } : { ok: false, message: MESSAGES[result.error] };
}
