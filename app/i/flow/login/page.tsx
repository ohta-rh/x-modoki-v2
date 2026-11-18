import { Suspense } from 'react';
import { SignInPage } from '@/_pages/sign-in';

async function SignIn({ searchParams }: Pick<PageProps<'/i/flow/login'>, 'searchParams'>) {
  const { next } = await searchParams;
  return <SignInPage next={typeof next === 'string' ? next : undefined} />;
}

export default function Page({ searchParams }: PageProps<'/i/flow/login'>) {
  return (
    <Suspense>
      <SignIn searchParams={searchParams} />
    </Suspense>
  );
}
