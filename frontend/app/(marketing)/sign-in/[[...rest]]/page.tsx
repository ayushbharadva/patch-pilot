import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AuthShell } from '@landing/components/auth/auth-shell';

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/app');
  }

  return <AuthShell mode="sign-in" />;
}
