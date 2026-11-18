'use client';

import { BarChart2, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { compactCount, relativeTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import type { Post } from '../model/types';
import { PostText } from './post-text';
import { QuotedCard } from './quoted-card';

const ACTIONS = [
  { key: 'replies', label: '返信', icon: MessageCircle },
  { key: 'reposts', label: 'リポスト', icon: Repeat2 },
  { key: 'likes', label: 'いいね', icon: Heart },
  { key: 'views', label: '表示', icon: BarChart2 },
] as const;

type Props = {
  post: Post;
  now: Date;
  /** The ⋯ menu, composed by the caller (entities cannot import features). */
  menu?: ReactNode;
  /** Names the article, e.g. 親の投稿 in a thread. */
  label?: string;
  /** Draws the 2px thread line under the avatar, down to the next post (ui-ux.md 6). */
  connector?: boolean;
  /** The like control, composed by the caller; without it the like count is shown as text. */
  like?: ReactNode;
  /** The bookmark control, shown at the end of the action row (#21). */
  bookmark?: ReactNode;
  /** The repost menu; without it the repost count is shown as text (#22). */
  repost?: ReactNode;
};

/** True when the click started on something with its own action: a link or a button. */
const ownAction = (event: MouseEvent) =>
  (event.target as HTMLElement).closest('a, button') !== null;

/**
 * One post (docs/architecture/ui-ux.md 5). The whole card opens the post's detail; links and buttons
 * inside keep their own behaviour. The actions arrive with their PBIs.
 */
export function PostCard({
  post,
  now,
  menu,
  label,
  connector = false,
  like,
  bookmark,
  repost,
}: Props) {
  const router = useRouter();
  const profile = `/${post.author.username}` as Route;
  const detail = `/${post.author.username}/status/${post.id}` as Route;
  return (
    <article
      aria-label={label}
      onClick={(event) => {
        // React bubbles events from portals (a dialog's backdrop) through the card: only a click
        // on the card's own DOM opens the detail.
        if (!event.currentTarget.contains(event.target as Node)) return;
        if (!ownAction(event)) router.push(detail);
      }}
      className={`relative flex cursor-pointer gap-3 px-4 py-3 hover:bg-hover/50 ${post.repostedBy ? 'pt-7' : ''} ${connector ? '' : 'border-b border-line'}`}
    >
      {post.repostedBy ? (
        <p className="absolute top-1 left-[52px] flex items-center gap-1 text-[13px] font-bold text-text-muted">
          <Repeat2 aria-hidden="true" className="size-4" />
          <Link href={`/${post.repostedBy.username}` as Route} className="hover:underline">
            {post.repostedBy.name}さんがリポスト
          </Link>
        </p>
      ) : null}
      {connector ? (
        <span
          data-thread-line
          aria-hidden="true"
          className="absolute top-[56px] bottom-0 left-[35px] w-0.5 bg-line"
        />
      ) : null}
      <Link href={profile} aria-label={`${post.author.name} のプロフィール`} className="shrink-0">
        <Avatar name={post.author.name} src={post.author.avatarUrl} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1 text-body">
          <Link href={profile} className="truncate font-bold hover:underline">
            {post.author.name}
          </Link>
          <span className="truncate text-text-muted">@{post.author.username}</span>
          <span className="text-text-muted">·</span>
          <time dateTime={post.createdAt} className="shrink-0 text-text-muted">
            {relativeTime(new Date(post.createdAt), now)}
          </time>
          {menu ? <div className="ml-auto">{menu}</div> : null}
        </div>
        {post.replyTo ? (
          <p className="text-body text-text-muted">
            返信先:{' '}
            <Link
              href={`/${post.replyTo.username}` as Route}
              className="text-brand hover:underline"
            >
              @{post.replyTo.username}
            </Link>
          </p>
        ) : null}
        <PostText text={post.text} />
        {post.quoted ? <QuotedCard quoted={post.quoted} now={now} /> : null}
        <div
          role="group"
          aria-label="操作"
          className="mt-3 flex max-w-[425px] justify-between text-text-muted"
        >
          {ACTIONS.map(({ key, label, icon: Icon }) => {
            if (key === 'likes' && like) return <div key={key}>{like}</div>;
            if (key === 'reposts' && repost) return <div key={key}>{repost}</div>;
            const count = post.counts[key];
            return (
              <span key={key} className="flex items-center gap-1 text-[13px]">
                <Icon aria-hidden="true" className="size-[18px]" />
                <span className="sr-only">{`${label} ${count.toLocaleString('ja-JP')}`}</span>
                <span aria-hidden="true">{count > 0 ? compactCount(count) : ''}</span>
              </span>
            );
          })}
          {bookmark ? <div>{bookmark}</div> : null}
        </div>
      </div>
    </article>
  );
}
