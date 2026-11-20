'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { relativeTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import type { QuotedPost } from '../model/types';
import { PostMedia } from './post-media';
import { PostText } from './post-text';

/**
 * The post inside a quote (#22, ui-ux.md 5): a 1px border and 16px corners, one level only — its
 * own quote is a 「ポストを表示」 link. Pressing it opens the quoted post, not the outer one.
 */
export function QuotedCard({ quoted, now }: { quoted: QuotedPost; now: Date }) {
  const router = useRouter();
  if ('deleted' in quoted) {
    return (
      <article
        aria-label="引用した投稿"
        className="mt-3 rounded-2xl border border-line px-3 py-3 text-body text-text-muted"
      >
        このポストは削除されました
      </article>
    );
  }
  const detail = `/${quoted.author.username}/status/${quoted.id}` as Route;
  return (
    <article
      aria-label="引用した投稿"
      onClick={(event) => {
        event.stopPropagation();
        if (!(event.target as HTMLElement).closest('a')) router.push(detail);
      }}
      className="mt-3 cursor-pointer rounded-2xl border border-line bg-bg px-3 py-3 hover:bg-hover/50"
    >
      <div className="flex items-center gap-1 text-body">
        <Avatar name={quoted.author.name} src={quoted.author.avatarUrl} size={20} />
        <span className="truncate font-bold">{quoted.author.name}</span>
        <span className="truncate text-text-muted">@{quoted.author.username}</span>
        <span className="text-text-muted">·</span>
        <time dateTime={quoted.createdAt} className="shrink-0 text-text-muted">
          {relativeTime(new Date(quoted.createdAt), now)}
        </time>
      </div>
      <PostText text={quoted.text} links={quoted.links} />
      {/* No `photos`: pressing an image opens the quoted post through the card's click (#115). */}
      <PostMedia media={quoted.media} />
      {quoted.quotesAnother ? (
        <Link href={detail} className="text-body text-brand hover:underline">
          ポストを表示
        </Link>
      ) : null}
    </article>
  );
}
