import Link from 'next/link';
import { LOGIN_PATH, SIGNUP_PATH } from '@/shared/config';
import { Logo } from '@/shared/ui/logo';
import { SiteFooter } from '@/shared/ui/site-footer';

const pill = 'flex h-10 w-[300px] items-center justify-center rounded-full text-body font-bold';

/** `/` for signed-out visitors: the logo on the left, sign-up and log-in on the right. */
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-10 p-8 lg:flex-row lg:gap-24">
        <Logo className="size-24 text-brand lg:size-80" />
        <div className="flex flex-col gap-8">
          <h1 className="text-5xl font-extrabold lg:text-6xl">x-modoki</h1>
          <p className="text-title font-bold">今日の話題に、参加しよう。</p>
          <div className="flex flex-col gap-3">
            <Link
              href={SIGNUP_PATH}
              className={`${pill} bg-brand-fill text-on-brand hover:brightness-90`}
            >
              アカウントを作成
            </Link>
            <p className="mt-6 font-bold">アカウントをお持ちの場合</p>
            <Link
              href={LOGIN_PATH}
              className={`${pill} border border-line text-brand hover:bg-hover`}
            >
              ログイン
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter className="text-center" />
    </div>
  );
}
