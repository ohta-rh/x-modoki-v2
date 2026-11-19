// @vitest-environment jsdom
import { useQueryClient } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toast } from '@/shared/ui/toast';
import { QueryProvider } from './query-provider';

function Probe() {
  const client = useQueryClient();
  return <p>staleTime={String(client.getDefaultOptions().queries?.staleTime)}</p>;
}

describe('QueryProvider', () => {
  it('子に QueryClient を渡し、30 秒の staleTime を既定にする', () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    expect(screen.getByText('staleTime=30000')).toBeTruthy();
  });

  it('アプリのどこからでも toast.add で出したトーストを表示する（#21）', async () => {
    render(
      <QueryProvider>
        <p>中身</p>
      </QueryProvider>,
    );
    act(() => {
      toast.add({ title: 'いいねできませんでした' });
    });
    expect(await screen.findByText('いいねできませんでした')).toBeTruthy();
  });

  // FR-OPS-07: トーストは数秒で消える
  it('トーストは 4 秒のあいだ出ていて、6 秒たつと消える（#30）', async () => {
    vi.useFakeTimers();
    try {
      render(
        <QueryProvider>
          <p>中身</p>
        </QueryProvider>,
      );
      act(() => {
        toast.add({ title: '消えるトースト' });
      });
      await act(async () => vi.advanceTimersByTime(4_000));
      expect(screen.queryByText('消えるトースト')).not.toBeNull();
      await act(async () => vi.advanceTimersByTime(2_000));
      expect(screen.queryByText('消えるトースト')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
