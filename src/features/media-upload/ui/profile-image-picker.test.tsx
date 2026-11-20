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

  it('送っている間に選び直したら、あとから選んだ画像だけを出し、その ID を渡す（先のが遅れて終わっても）', async () => {
    const finish: Record<string, (id: string) => void> = {};
    prepareImage.mockImplementation(async (file: File) => ({
      blob: file,
      width: 400,
      height: 400,
    }));
    uploadImage.mockImplementation(
      ({ blob }: { blob: File }) => new Promise((resolve) => (finish[blob.name] = resolve)),
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (file: File) => `blob:${file.name}`,
        revokeObjectURL: vi.fn(),
      }),
    );
    const onChange = vi.fn();
    render(<ProfileImagePicker kind="avatar" currentUrl={null} onChange={onChange} />);
    const input = screen.getByLabelText('アバターの画像を選ぶ');
    await userEvent.upload(input, new File(['a'], 'a.png', { type: 'image/png' }));
    await userEvent.upload(input, new File(['b'], 'b.png', { type: 'image/png' }));
    await waitFor(() => expect(Object.keys(finish).sort()).toEqual(['a.png', 'b.png']));
    finish['b.png']('B');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ id: 'B', busy: false }));
    finish['a.png']('A');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onChange).toHaveBeenLastCalledWith({ id: 'B', busy: false });
    expect(screen.getByRole('img', { name: '新しいアバター' })).toHaveAttribute(
      'src',
      'blob:b.png',
    );
  });

  it('選び直したあとに、先の画像の変換が終わっても、失敗しても、何も出さない', async () => {
    const prepared: Record<string, () => void> = {};
    const failUpload: Record<string, () => void> = {};
    prepareImage.mockImplementation(
      (file: File) =>
        new Promise((resolve) => {
          prepared[file.name] = () => resolve({ blob: file, width: 400, height: 400 });
        }),
    );
    uploadImage.mockImplementation(
      ({ blob }: { blob: File }) =>
        new Promise((_, reject) => (failUpload[blob.name] = () => reject(new Error('network')))),
    );
    const onChange = vi.fn();
    render(<ProfileImagePicker kind="avatar" currentUrl={null} onChange={onChange} />);
    const input = screen.getByLabelText('アバターの画像を選ぶ');
    // a: chosen, then replaced while it is still being prepared.
    await userEvent.upload(input, new File(['a'], 'a.png', { type: 'image/png' }));
    // c: prepared and being sent, then replaced, then its sending fails.
    await userEvent.upload(input, new File(['c'], 'c.png', { type: 'image/png' }));
    prepared['c.png']();
    await waitFor(() => expect(failUpload['c.png']).toBeDefined());
    await userEvent.upload(input, new File(['b'], 'b.png', { type: 'image/png' }));
    prepared['a.png']();
    failUpload['c.png']();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith({ id: null, busy: true });
  });

  it('選び直した画像が送れなければ、前のプレビューも消し、知らせる（画面と保存するものを揃える。レビュー 2）', async () => {
    uploadImage.mockResolvedValueOnce('7').mockRejectedValueOnce(new Error('network'));
    const onChange = vi.fn();
    render(<ProfileImagePicker kind="avatar" currentUrl={null} onChange={onChange} />);
    const input = screen.getByLabelText('アバターの画像を選ぶ');
    await userEvent.upload(input, png);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ id: '7', busy: false }));
    await userEvent.upload(input, new File(['y'], 'other.png', { type: 'image/png' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('画像を送れませんでした');
    expect(screen.queryByRole('img', { name: '新しいアバター' })).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith({ id: null, busy: false });
  });

  it('選んだあとは入力欄を空にし、送れなかった同じファイルを選び直せる（レビュー 3）', async () => {
    uploadImage.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce('9');
    const onChange = vi.fn();
    render(<ProfileImagePicker kind="avatar" currentUrl={null} onChange={onChange} />);
    const input = screen.getByLabelText<HTMLInputElement>('アバターの画像を選ぶ');
    await userEvent.upload(input, png);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(input.value).toBe('');
    await userEvent.upload(input, png);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ id: '9', busy: false }));
    expect(prepareImage).toHaveBeenCalledTimes(2);
  });
});
