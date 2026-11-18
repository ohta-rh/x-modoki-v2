// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ViewCounter } from './view-counter';

describe('ViewCounter（#21）', () => {
  it('開いたときに 1 回だけ、表示を数える POST を送り、何も描かない', async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchSpy);
    const { container, rerender } = render(<ViewCounter postId="42" />);
    rerender(<ViewCounter postId="42" />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy).toHaveBeenCalledWith('/api/posts/42/view', { method: 'POST' });
    expect(container).toBeEmptyDOMElement();
  });

  it('送れなくても、画面に何も起きない（投げない）', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('offline');
    });
    vi.stubGlobal('fetch', fetchSpy);
    const errors = vi.spyOn(console, 'error');
    render(<ViewCounter postId="7" />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((done) => setTimeout(done, 0));
    expect(errors).not.toHaveBeenCalled();
  });
});
