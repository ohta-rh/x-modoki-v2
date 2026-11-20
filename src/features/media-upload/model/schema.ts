import { z } from 'zod';

/** What the browser declares before an upload (#25, threat model T-07): checked again on attach. */
export const uploadRequestSchema = z.object({
  // JPEG only where a browser cannot write WebP (Safari, ADR-0043).
  contentType: z.enum(['image/webp', 'image/gif', 'image/jpeg']),
  contentLength: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024),
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
