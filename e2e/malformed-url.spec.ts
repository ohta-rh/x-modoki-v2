import { expect, test } from '@playwright/test';

// A path Next.js cannot decode answered a bare 500 "Internal Server Error" (#73).
test('解読できない % を含む URL は 404 で、ふつうの URL は今までどおり（#73）', async ({
  page,
  request,
}) => {
  for (const path of ['/%ZZ', '/x/status/%ZZ', '/api/posts/%ZZ/view']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    expect(await response.text(), path).not.toContain('Internal Server Error');
  }
  const encoded = await request.get('/%E3%81%82', { maxRedirects: 0 });
  expect(encoded.status()).not.toBe(500);
  const response = await page.goto('/x/status/%ZZ');
  expect(response!.status()).toBe(404);
  await expect(page.getByText('Internal Server Error')).toHaveCount(0);
});
