// @vitest-environment jsdom
import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
