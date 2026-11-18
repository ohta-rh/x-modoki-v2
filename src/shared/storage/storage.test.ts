import { describe, expect, it } from 'vitest';
import { newId } from '@/shared/lib/id';
import { copyObject, presignUpload, readHead, removeObject } from './storage';

// Runs against the Garage from Docker Compose (docs/research/garage-presigned-upload.md).
describe('storage（#25、ADR-0008）', () => {
  it('署名つき URL へ申告どおりの大きさで PUT でき、先頭のバイトを読め、消せる', async () => {
    const key = `test/${newId()}`;
    const body = new TextEncoder().encode('GIF89a,\u0001È\u0000rest-of-the-file');
    const url = await presignUpload({ key, contentType: 'image/gif', contentLength: body.length });
    expect(url).toMatch(/X-Amz-Expires=60/);
    expect(url).not.toMatch(/x-amz-checksum/i);
    const put = await fetch(url, { method: 'PUT', body, headers: { 'content-type': 'image/gif' } });
    expect(put.status).toBe(200);
    expect([...(await readHead(key, 6))!]).toEqual([...new TextEncoder().encode('GIF89a')]);
    await removeObject(key);
    expect(await readHead(key, 6)).toBeNull();
  });

  it('署名と違う大きさの PUT は通らない', async () => {
    const key = `test/${newId()}`;
    const url = await presignUpload({ key, contentType: 'image/gif', contentLength: 3 });
    const put = await fetch(url, {
      method: 'PUT',
      body: 'four',
      headers: { 'content-type': 'image/gif' },
    });
    expect(put.status).toBe(403);
    expect(await readHead(key, 4)).toBeNull();
  });

  it('無いもの以外の失敗（範囲の誤り）は、そのまま投げる', async () => {
    const key = `test/${newId()}`;
    const url = await presignUpload({ key, contentType: 'image/gif', contentLength: 4 });
    await fetch(url, { method: 'PUT', body: 'GIF8', headers: { 'content-type': 'image/gif' } });
    await expect(readHead(key, 0)).rejects.toThrow();
    await removeObject(key);
  });

  it('オブジェクトをバケットの中で写せる。無いものは false、それ以外の失敗はそのまま投げる（#25 レビュー 2）', async () => {
    const from = `test/${newId()}`;
    const to = `test/${newId()}`;
    const url = await presignUpload({ key: from, contentType: 'image/gif', contentLength: 6 });
    await fetch(url, { method: 'PUT', body: 'GIF89a', headers: { 'content-type': 'image/gif' } });
    expect(await copyObject(from, to)).toBe(true);
    expect([...(await readHead(to, 6))!]).toEqual([...new TextEncoder().encode('GIF89a')]);
    expect(await copyObject(`test/${newId()}`, `test/${newId()}`)).toBe(false);
    await expect(copyObject(from, '')).rejects.toThrow();
    await Promise.all([removeObject(from), removeObject(to)]);
  });
});
