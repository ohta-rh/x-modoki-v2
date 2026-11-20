'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { ACCENTS, displayCookies, THEMES } from '@/shared/config';
import { updateDisplay } from './update-display';

const displaySchema = z.object({
  theme: z.enum(THEMES),
  accent: z.enum(Object.keys(ACCENTS) as [keyof typeof ACCENTS, ...(keyof typeof ACCENTS)[]]),
});

export type SetDisplayActionResult =
  { ok: true } | { ok: false; error: 'VALIDATION' | 'UNAUTHORIZED' };

/**
 * Saves the theme and accent colour (#29): in the viewer's row, and in cookies the head script
 * reads before the next first paint (ADR-0051).
 */
export async function setDisplayAction(input: unknown): Promise<SetDisplayActionResult> {
  const parsed = displaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'VALIDATION' };
  const result = await updateDisplay(parsed.data);
  if (!result.ok) return result;
  const jar = await cookies();
  for (const cookie of displayCookies(parsed.data)) jar.set(cookie);
  return { ok: true };
}
