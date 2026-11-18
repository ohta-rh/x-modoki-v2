import { BarChart2, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { compactCount, relativeTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import type { Post } from '../model/types';
import { PostText } from './post-text';

const ACTIONS = [
  { key: 'replies', label: '返信', icon: MessageCircle },
  { key: 'reposts', label: 'リポスト', icon: Repeat2 },
  { key: 'likes', label: 'いいね', icon: Heart },
  { key: 'views', label: '表示', icon: BarChart2 },
] as const;

/** One post on a timeline (docs/architecture/ui-ux.md 5). The actions arrive with their PBIs. */
export function PostCard({ post, now }: { post: Post; now: Date }) {
  const profile = `/${post.author.username}` as Route;
  return (
    <article className="flex gap-3 border-b border-line px-4 py-3">
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
        </div>
        <PostText text={post.text} />
        <div
          role="group"
          aria-label="操作"
          className="mt-3 flex max-w-[425px] justify-between text-text-muted"
        >
          {ACTIONS.map(({ key, label, icon: Icon }) => {
            const count = post.counts[key];
            return (
              <span key={key} className="flex items-center gap-1 text-[13px]">
                <Icon aria-hidden="true" className="size-[18px]" />
                <span className="sr-only">{`${label} ${count.toLocaleString('ja-JP')}`}</span>
                <span aria-hidden="true">{count > 0 ? compactCount(count) : ''}</span>
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}
