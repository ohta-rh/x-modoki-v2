// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './page-header';

describe('PageHeader（#74）', () => {
  it('見出しは 1 行に収め、長い名前は切り詰める（列を広げない）', () => {
    render(<PageHeader title={'N'.repeat(50)} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('min-w-0', 'truncate');
  });

  it('640px 未満では、ログインしていて左のアカウントのボタンがあるときだけ、その分の余白を取る（#85 のレビュー 2）', () => {
    render(<PageHeader title="ホーム" />);
    expect(screen.getByRole('banner')).toHaveClass(
      'px-4',
      'group-data-signed-in/shell:pl-14',
      'sm:group-data-signed-in/shell:pl-4',
    );
  });
});
