import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('Cloudflare の cf-connecting-ip を一番に使う', () => {
    expect(
      clientIp(new Headers({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' })),
    ).toBe('1.1.1.1');
  });

  it('無ければ x-forwarded-for の最初の値', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': ' 3.3.3.3 , 10.0.0.1' }))).toBe('3.3.3.3');
  });

  it('どちらも無ければ unknown', () => {
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
