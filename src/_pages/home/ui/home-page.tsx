import type { PostPage, TimelineKind } from '@/entities/post';
import { createPostAction } from '@/features/post-compose/index.server';
import { deletePostAction } from '@/features/post-delete/index.server';
import { PageHeader } from '@/widgets/app-shell';
import { HomeTimeline } from '@/widgets/timeline-feed';
import { HomeTabs } from './home-tabs';

type Props = { kind: TimelineKind; firstPage: PostPage; now: string };

/** /home: the header with tabs, the composer and the timeline (ui-ux.md 6–7). */
export function HomePage({ kind, firstPage, now }: Props) {
  return (
    <>
      <div className="sticky top-0 z-10">
        <PageHeader title="ホーム" />
        <div className="bg-[var(--header-bg)] backdrop-blur-[12px]">
          <HomeTabs kind={kind} />
        </div>
      </div>
      <HomeTimeline
        key={kind}
        kind={kind}
        firstPage={firstPage}
        now={now}
        action={createPostAction}
        deleteAction={deletePostAction}
      />
    </>
  );
}
