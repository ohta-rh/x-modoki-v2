// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileImagePicker } from './profile-image-picker';

const prepareImage = vi.fn();
const uploadImage = vi.fn();
vi.mock('../lib/prepare-image', () => ({
  prepareImage: (...args: unknown[]) => prepareImage(...args),
  uploadImage: (...args: unknown[]) => uploadImage(...args),
}));

const png = new File(['x'], 'me.png', { type: 'image/png' });

beforeEach(() => {
  prepareImage.mockReset();
  uploadImage.mockReset();
  prepareImage.mockImplementation(async (_file: File, kind: string) =>
    kind === 'avatar'
      ? { blob: new Blob(['a']), width: 400, height: 400 }
      : { blob: new Blob(['b']), width: 1500, height: 500 },
  );
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: () => 'blob:cropped', revokeObjectURL: vi.fn() }),
  );
});

describe('ProfileImagePicker（#25）', () => {
  it('アバター: 選んだ画像を 400×400 に切り抜いて送り、送り終えたら ID を渡す', async () => {
    let finish: (id: string) => void = () => {};
    uploadImage.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const onChange = vi.fn();
    render(<ProfileImagePicker kind="avatar" currentUrl={null} onChange={onChange} />);
    await userEvent.upload(screen.getByLabelText('アバターの画像を選ぶ'), png);
    expect(prepareImage).toHaveBeenCalledWith(png, 'avatar');
    const preview = await screen.findByRole('img', { name: '新しいアバター' });
    expect(preview).toHaveAttribute('src', 'blob:cropped');
    expect(preview).toHaveAttribute('width', '400');
    expect(onChange).toHaveBeenLastCalledWith({ id: null, busy: true });
    finish('7');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ id: '7', busy: false }));
  });

  it('バナー: 1500×500。今の画像があれば、選ぶ前はそれを出す', async () => {
    uploadImage.mockResolvedValue('8');
    const onChange = vi.fn();
    const { container } = render(
      <ProfileImagePicker
        kind="banner"
        currentUrl="https://media.test/b.webp"
        onChange={onChange}
      />,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://media.test/b.webp');
    await userEvent.upload(screen.getByLabelText('バナーの画像を選ぶ'), png);
    expect(await screen.findByRole('img', { name: '新しいバナー' })).toHaveAttribute(
      'width',
      '1500',
    );
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ id: '8', busy: false }));
  });

  it('送れなければ知らせ、ID は渡さない', async () => {
    uploadImage.mockRejectedValue(new Error('network'));
    const onChange = vi.fn();
    render(<ProfileImagePicker kind="avatar" currentUrl={null} onChange={onChange} />);
    await userEvent.upload(screen.getByLabelText('アバターの画像を選ぶ'), png);
    expect(await screen.findByRole('alert')).toHaveTextContent('画像を送れませんでした');
    expect(onChange).toHaveBeenLastCalledWith({ id: null, busy: false });
  });

  it('選ぶのを取り消したら（ファイルの無い change）、何もしない', () => {
    const onChange = vi.fn();
    render(<ProfileImagePicker kind="avatar" currentUrl={null} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('アバターの画像を選ぶ'), { target: { files: [] } });
    expect(prepareImage).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ハイドレーションの前に選んだ画像も受け取る（#47 と同じ）', async () => {
    uploadImage.mockResolvedValue('9');
    const onChange = vi.fn();
    const { renderToString } = await import('react-dom/server');
    const { hydrateRoot } = await import('react-dom/client');
    const { act } = await import('react');
    const picker = <ProfileImagePicker kind="avatar" currentUrl={null} onChange={onChange} />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(picker);
    document.body.append(container);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    // Chosen before React took over the page.
    Object.defineProperty(input, 'files', { value: [png], configurable: true });
    await act(async () => {
      hydrateRoot(container, picker);
    });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ id: '9', busy: false }));
    expect(container.querySelector('img')).toHaveAttribute('alt', '新しいアバター');
    container.remove();
  });
});
