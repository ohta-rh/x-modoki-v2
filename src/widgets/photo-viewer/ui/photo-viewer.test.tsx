// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoViewer } from './photo-viewer';

const media = [1, 2, 3].map((n) => ({
  url: `https://media.test/${n}.webp`,
  width: 100 * n,
  height: 100,
  alt: n === 2 ? '二枚目' : '',
}));
const base = '/taro/status/1';

afterEach(() => vi.restoreAllMocks());

const show = (index: number, onClose = vi.fn()) => {
  render(<PhotoViewer media={media} base={base} index={index} onClose={onClose} />);
  return { onClose, viewer: screen.getByRole('dialog', { name: '画像' }) };
};
const shown = (viewer: HTMLElement) => viewer.querySelector('img')!;

describe('PhotoViewer（#25、routing.md の /{username}/status/{id}/photo/{n}）', () => {
  it('n 枚目の画像を、幅・高さ・代替テキスト付きで出す', () => {
    const { viewer } = show(2);
    expect(shown(viewer)).toHaveAttribute('src', 'https://media.test/2.webp');
    expect(shown(viewer)).toHaveAttribute('width', '200');
    expect(shown(viewer)).toHaveAttribute('alt', '二枚目');
  });

  it('左右のキーと前後のボタンで移り、URL を置き換える（端ではそれ以上進まない）', async () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    const { viewer } = show(1);
    expect(screen.queryByRole('button', { name: '前の画像' })).toBeNull();
    await userEvent.keyboard('{ArrowRight}');
    expect(shown(viewer)).toHaveAttribute('src', 'https://media.test/2.webp');
    expect(replace).toHaveBeenLastCalledWith(null, '', '/taro/status/1/photo/2');
    await userEvent.click(screen.getByRole('button', { name: '次の画像' }));
    expect(shown(viewer)).toHaveAttribute('src', 'https://media.test/3.webp');
    expect(screen.queryByRole('button', { name: '次の画像' })).toBeNull();
    await userEvent.keyboard('{ArrowRight}');
    expect(shown(viewer)).toHaveAttribute('src', 'https://media.test/3.webp');
    await userEvent.click(screen.getByRole('button', { name: '前の画像' }));
    await userEvent.keyboard('{ArrowLeft}');
    expect(shown(viewer)).toHaveAttribute('src', 'https://media.test/1.webp');
    expect(replace).toHaveBeenLastCalledWith(null, '', '/taro/status/1/photo/1');
    await userEvent.keyboard('{ArrowLeft}');
    expect(shown(viewer)).toHaveAttribute('src', 'https://media.test/1.webp');
  });

  it('「閉じる」と Esc で閉じる', async () => {
    const { onClose } = show(1);
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
