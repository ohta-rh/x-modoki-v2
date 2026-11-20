import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DISPLAY_SCRIPT } from '@/shared/config';
import { DisplayScript } from './display-script';

describe('DisplayScript（#29、ADR-0051）', () => {
  it('head に置く、cookie のテーマと色を html に付けるスクリプト', () => {
    expect(renderToStaticMarkup(<DisplayScript />)).toBe(`<script>${DISPLAY_SCRIPT}</script>`);
  });
});
