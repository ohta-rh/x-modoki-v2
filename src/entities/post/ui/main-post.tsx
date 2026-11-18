import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { absoluteTime, compactCount } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import type { Post } from '../model/types';
import { PostMedia } from './post-media';
import { PostText } from './post-text';
import { QuotedCard } from './quoted-card';

const COUNTS = [
  { key: 'replies', label: '件の返信' },
  { key: 'reposts', label: '件のリポスト' },
  { key: 'likes', label: '件のいいね' },
] as const;

/** The post being read on its detail page: larger text, the absolute time, the counts (#20). */
export function MainPost({
  post,
  now,
  menu,
  actions,
}: {
  post: Post;
  now: Date;
  menu?: ReactNode;
  /** The like / bookmark controls, composed by the caller (#21). */
  actions?: ReactNode;
}) {
  const profile = `/${post.author.username}` as Route;
  return (
    <article aria-label="投稿の本体" data-post="main" className="border-b border-line px-4 pt-3">
      <div className="flex items-center gap-3">
        <Link href={profile} aria-label={`${post.author.name} のプロフィール`}>
          <Avatar name={post.author.name} src={post.author.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1 text-body">
          <Link href={profile} className="block truncate font-bold hover:underline">
            {post.author.name}
          </Link>
          <span className="block truncate text-text-muted">@{post.author.username}</span>
        </div>
        {menu}
      </div>
      {post.replyTo ? (
        <p className="mt-3 text-body text-text-muted">
          返信先:{' '}
          <Link href={`/${post.replyTo.username}` as Route} className="text-brand hover:underline">
            @{post.replyTo.username}
          </Link>
        </p>
      ) : null}
      <div className="mt-3">
        <PostText text={post.text} size="lg" />
        <PostMedia media={post.media} photos={`/${post.author.username}/status/${post.id}`} />
        {post.quoted ? <QuotedCard quoted={post.quoted} now={now} /> : null}
      </div>
      <p className="my-4 text-body text-text-muted">
        <time dateTime={post.createdAt}>{absoluteTime(new Date(post.createdAt))}</time>
      </p>
      <p className="flex gap-5 border-t border-line py-4 text-body text-text-muted">
        {COUNTS.map(({ key, label }) => (
          <span key={key}>
            <span className="font-bold text-text">{compactCount(post.counts[key])}</span> {label}
          </span>
        ))}
      </p>
      {actions ? (
        <div
          role="group"
          aria-label="操作"
          className="flex justify-around border-t border-line py-1"
        >
          {actions}
        </div>
      ) : null}
    </article>
  );
}
