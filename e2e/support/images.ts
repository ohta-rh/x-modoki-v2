import type { Page } from '@playwright/test';

// A small PNG drawn in the page itself, so no binary fixture is kept in the repository.
export async function pngFile(page: Page, width: number, height: number) {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#1d9bf0';
      context.fillRect(0, 0, w, h);
      return canvas.toDataURL('image/png').split(',')[1];
    },
    [width, height],
  );
  return {
    name: `photo-${width}x${height}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from(base64, 'base64'),
  };
}
