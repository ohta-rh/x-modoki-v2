import { describe, expect, it } from 'vitest';
import { profileSchema } from './schema';

const valid = { name: '花子', bio: '', location: '', website: '' };
const errors = (input: Record<string, unknown>) => {
  const result = profileSchema.safeParse({ ...valid, ...input });
  return result.success ? {} : result.error.flatten().fieldErrors;
};

describe('profileSchema（#23）', () => {
  // FR-PROF-04: 編集
  it('名前は 1〜50 文字、自己紹介 160、場所 30、リンクは 100 文字までの http か https', () => {
    expect(errors({})).toEqual({});
    expect(errors({ name: '' }).name).toEqual(['名前を入れてください']);
    expect(errors({ name: 'あ'.repeat(51) }).name).toEqual(['名前は 50 文字までです']);
    expect(errors({ bio: 'あ'.repeat(161) }).bio).toEqual(['自己紹介は 160 文字までです']);
    expect(errors({ location: 'あ'.repeat(31) }).location).toEqual(['場所は 30 文字までです']);
    expect(errors({ website: `https://example.com/${'a'.repeat(81)}` }).website).toEqual([
      'ウェブサイトは 100 文字までです',
    ]);
    for (const bad of ['ftp://example.com', 'javascript:alert(1)', 'example.com']) {
      expect(errors({ website: bad }).website).toEqual(['http か https の URL を入れてください']);
    }
    expect(errors({ website: 'http://example.com' })).toEqual({});
  });

  it('前後の空白は取り除く', () => {
    const result = profileSchema.parse({ ...valid, name: '  花子  ', website: ' https://x.test ' });
    expect(result).toMatchObject({ name: '花子', website: 'https://x.test' });
  });

  it('アバターとバナーの画像の ID は、無いか、数字の文字列だけ（#25）', () => {
    expect(profileSchema.parse({ ...valid, avatarId: '123', bannerId: '45' })).toMatchObject({
      avatarId: '123',
      bannerId: '45',
    });
    expect(profileSchema.safeParse(valid).success).toBe(true);
    for (const bad of ['', 'abc', '-1', '1.5']) {
      expect(profileSchema.safeParse({ ...valid, avatarId: bad }).success).toBe(false);
      expect(profileSchema.safeParse({ ...valid, bannerId: bad }).success).toBe(false);
    }
  });
});
