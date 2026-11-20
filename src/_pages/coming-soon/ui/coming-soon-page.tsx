import { PageHeader } from '@/widgets/app-shell';

/** Stands in for a screen whose PBI is still ahead, so navigation and prefetch never hit a 404. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <p className="px-4 py-8 text-center text-text-muted">この画面は準備中です</p>
    </>
  );
}
