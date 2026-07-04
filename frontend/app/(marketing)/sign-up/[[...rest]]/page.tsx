import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AuthShell } from '@landing/components/auth/auth-shell';

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/app');
  }

  return <AuthShell mode="sign-up" />;
}
