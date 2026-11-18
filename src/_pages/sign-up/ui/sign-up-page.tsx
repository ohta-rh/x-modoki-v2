import { SignUpForm } from '@/features/account-access';
import { signUpAction } from '@/features/account-access/index.server';
import { CenteredCard } from '@/shared/ui/centered-card';

/** /i/flow/signup. */
export function SignUpPage() {
  return (
    <CenteredCard title="x-modoki に登録">
      <SignUpForm action={signUpAction} />
    </CenteredCard>
  );
}
