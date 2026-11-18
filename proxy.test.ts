import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from './proxy';

describe('proxy', () => {
  it('まだ何も転送せず、リクエストをそのまま通す', () => {
    const response = proxy(new NextRequest('http://localhost:3000/home'));
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('対象のパスを持つ', () => {
    expect(config.matcher).toEqual(['/home']);
  });
});
