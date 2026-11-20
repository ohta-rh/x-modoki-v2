import { calendarDate } from '@/shared/lib/format';
import { PageHeader } from '@/widgets/app-shell';
import type { AccountData } from '../api/load-account';

/** /settings/account (#29): what the account is. Changing or deleting it comes later. */
export function AccountPage({ username, email, createdAt }: AccountData) {
  return (
    <>
      <PageHeader title="アカウント" />
      <section aria-label="アカウントの情報">
        <dl className="text-body">
          {[
            ['ユーザー名', `@${username}`],
            ['メールアドレス', email],
            ['登録した日', calendarDate(new Date(createdAt))],
          ].map(([term, value]) => (
            <div key={term} className="border-b border-line px-4 py-3">
              <dt className="text-text-muted">{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
