'use client';

/**
 * What an unexpected exception shows instead of Next.js's English screen (#71). Loading the page
 * again is the retry: it reads everything afresh, where a reset would draw the same broken data.
 */
export function ErrorPage({ reload = () => window.location.reload() }: { reload?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 px-8 py-16 text-center">
      <h1 className="text-title font-bold">問題が起きました</h1>
      <p className="text-body text-text-muted">読み込み直すと、続きから使えます。</p>
      <button
        type="button"
        onClick={() => reload()}
        className="rounded-full bg-brand-fill px-4 py-2 text-body font-bold text-on-brand hover:brightness-90"
      >
        もう一度読み込む
      </button>
    </div>
  );
}

/** The same screen when the root layout itself failed: it has to bring its own document. */
export function GlobalErrorPage() {
  return (
    <html lang="ja">
      <body>
        <ErrorPage />
      </body>
    </html>
  );
}
