// Time and number formats for Japanese (docs/architecture/ui-ux.md 5, NFR-I18N-02).
const TIME_ZONE = 'Asia/Tokyo';

const parts = (date: Date) => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return { year: values.year, month: values.month, day: values.day };
};

/** `N秒` / `N分` / `N時間` within a day, then `M月D日` this year and `YYYY年M月D日` before. */
export function relativeTime(date: Date, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}時間`;
  const then = parts(date);
  const day = `${then.month}月${then.day}日`;
  return then.year === parts(now).year ? day : `${then.year}年${day}`;
}

const oneDecimal = (value: number) => (Math.floor(value * 10) / 10).toString();

/** Below 10,000 with separators; then `1.2万` and `3.4億`, rounded down to one decimal. */
export function compactCount(n: number): string {
  if (n < 10_000) return n.toLocaleString('ja-JP');
  if (n < 100_000_000) return `${oneDecimal(n / 10_000)}万`;
  return `${oneDecimal(n / 100_000_000)}億`;
}
