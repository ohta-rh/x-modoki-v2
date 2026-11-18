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

/** The detail page's time, `午後3:04 · 2026年11月18日` (Asia/Tokyo). */
export function absoluteTime(date: Date): string {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const hour = Number(values.hour);
  const clock = `${hour < 12 ? '午前' : '午後'}${hour % 12}:${values.minute}`;
  return `${clock} · ${values.year}年${values.month}月${values.day}日`;
}

/** When a user joined, as on a profile (#23): 「2025年4月から利用しています」, in Japan time. */
export function joinedMonth(date: Date): string {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: 'numeric' })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}年${values.month}月から利用しています`;
}

/** A calendar date, 「2026年11月19日」, in Japan time (#29: when an account was made). */
export function calendarDate(date: Date): string {
  return absoluteTime(date).split(' · ')[1];
}
