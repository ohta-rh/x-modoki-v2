import { SignInForm } from '@/features/account-access';
import { signInAction } from '@/features/account-access/index.server';
import { CenteredCard } from '@/shared/ui/centered-card';

/** /i/flow/login. `next` is checked by the action before redirecting (NFR-SEC-10). */
export function SignInPage({ next }: { next?: string }) {
  return (
    <CenteredCard title="x-modoki にログイン">
      <SignInForm action={signInAction} next={next} />
    </CenteredCard>
  );
}
