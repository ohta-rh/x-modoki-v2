// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageAttachments, useImageAttachments } from './image-attachments';

const uploadImage = vi.fn();
vi.mock('../lib/prepare-image', () => ({
  prepareImage: async (file: File) => ({ blob: file, width: 10, height: 10 }),
  uploadImage: (...args: unknown[]) => uploadImage(...args),
}));

type State = ReturnType<typeof useImageAttachments>;
let latest: State | null = null;
const expose = (state: State) => {
  latest = state;
};
function Harness({ onState = expose }: { onState?: (state: State) => void }) {
  const attachments = useImageAttachments();
  useEffect(() => onState(attachments));
  return <ImageAttachments attachments={attachments} />;
}
const png = (n: number) => new File([`${n}`], `${n}.png`, { type: 'image/png' });

beforeEach(() => {
  uploadImage.mockReset();
  let next = 0;
  uploadImage.mockImplementation(async () => String(++next));
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: (file: File) => `blob:${file.name}`,
      revokeObjectURL: vi.fn(),
    }),
  );
});

describe('ImageAttachments（#25）', () => {
  it('選んだ画像を送って並べ、代替テキストを付け外しでき、ID と代替テキストを渡す', async () => {
    render(<Harness />);
    await userEvent.upload(screen.getByLabelText('画像を追加'), [png(1), png(2)]);
    const group = within(screen.getByRole('group', { name: '添付した画像' }));
    expect(group.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
      '1 枚目の画像',
      '2 枚目の画像',
    ]);
    await waitFor(() => expect(latest!.ready).toBe(true));
    await userEvent.click(group.getByRole('button', { name: '1 枚目の代替テキスト' }));
    await userEvent.type(screen.getByRole('textbox', { name: '代替テキスト' }), '青い四角');
    await userEvent.click(screen.getByRole('button', { name: '代替テキストを保存' }));
    await userEvent.click(group.getByRole('button', { name: '2 枚目を外す' }));
    expect(latest!.media).toEqual([{ id: '1', alt: '青い四角' }]);
    expect(latest!.count).toBe(1);
  });

  it('ファイルの無い選択（取り消し・遅れて届いた change）は何も変えず、「4 枚まで」の知らせも残す（#54）', async () => {
    const { act } = await import('@testing-library/react');
    render(<Harness />);
    await userEvent.upload(screen.getByLabelText('画像を追加'), [1, 2, 3, 4, 5].map(png));
    expect(screen.getByText('画像は 4 枚までです')).toBeInTheDocument();
    act(() => latest!.add([]));
    expect(screen.getByText('画像は 4 枚までです')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '添付した画像' }).querySelectorAll('img'),
    ).toHaveLength(4);
  });

  it('5 枚目は選べない（4 枚までにして知らせ、入力欄を止める）。clear で空にする', async () => {
    render(<Harness />);
    await userEvent.upload(screen.getByLabelText('画像を追加'), [1, 2, 3, 4, 5].map(png));
    expect(
      screen.getByRole('group', { name: '添付した画像' }).querySelectorAll('img'),
    ).toHaveLength(4);
    expect(screen.getByText('画像は 4 枚までです')).toBeInTheDocument();
    expect(screen.getByLabelText('画像を追加')).toBeDisabled();
    await waitFor(() => expect(latest!.ready).toBe(true));
    const { act } = await import('@testing-library/react');
    act(() => latest!.clear());
    expect(screen.queryByRole('group', { name: '添付した画像' })).toBeNull();
    expect(screen.getByLabelText('画像を追加')).toBeEnabled();
  });

  it('送れなかった画像は印を付けて知らせ、ready にしない', async () => {
    uploadImage.mockRejectedValueOnce(new Error('upload 403'));
    render(<Harness />);
    await userEvent.upload(screen.getByLabelText('画像を追加'), [png(1)]);
    expect(await screen.findByRole('alert')).toHaveTextContent('画像を送れませんでした');
    expect(latest!.ready).toBe(false);
    expect(latest!.media).toEqual([]);
  });

  it('送れなかった画像を外すと、送れなかった画像が残っていなければ文言も消え、残っていれば残る（#90）', async () => {
    uploadImage
      .mockRejectedValueOnce(new Error('upload 403'))
      .mockRejectedValueOnce(new Error('403'));
    render(<Harness />);
    await userEvent.upload(screen.getByLabelText('画像を追加'), [png(1), png(2)]);
    expect(await screen.findByRole('alert')).toHaveTextContent('画像を送れませんでした');
    await userEvent.click(screen.getByRole('button', { name: '1 枚目を外す' }));
    expect(screen.getByRole('alert')).toHaveTextContent('画像を送れませんでした');
    await userEvent.click(screen.getByRole('button', { name: '1 枚目を外す' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('送っている途中で外した画像の失敗が、あとから届いても文言は出さない（#90 のレビュー）', async () => {
    let fail!: (error: Error) => void;
    uploadImage.mockImplementationOnce(() => new Promise((_, reject) => (fail = reject)));
    render(<Harness />);
    await userEvent.upload(screen.getByLabelText('画像を追加'), [png(1)]);
    await waitFor(() => expect(uploadImage).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: '1 枚目を外す' }));
    fail(new Error('upload 403'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ハイドレーションの前に選んだ画像も、受け取る（#47 と同じ）', async () => {
    const { renderToString } = await import('react-dom/server');
    const { hydrateRoot } = await import('react-dom/client');
    const { act } = await import('react');
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Harness />);
    document.body.append(container);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    // Chosen before React took over the page.
    Object.defineProperty(input, 'files', { value: [png(1)], configurable: true });
    await act(async () => {
      hydrateRoot(container, <Harness />);
    });
    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(1));
    container.remove();
  });
});
