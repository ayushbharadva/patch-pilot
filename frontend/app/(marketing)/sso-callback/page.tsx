'use client';

import { useEffect, useRef } from 'react';
import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';


export default function SSOCallbackPage() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    void (async () => {
      if (!clerk.loaded || hasRun.current || !signIn || !signUp) {
        return;
      }
      // Guard against Next.js re-running the effect while the session activates.
      hasRun.current = true;


      const navigate = async ({
        session,
        decorateUrl,
      }: {
        session?: { currentTask?: unknown } | null;
        decorateUrl: (url: string) => string;
      }) => {
        if (session?.currentTask) {
          return;
        }

        const url = decorateUrl('/app');
        if (url.startsWith('http')) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      };

      try {
        // Completed sign-in — activate and enter the app.
        if (signIn.status === 'complete') {
          await signIn.finalize({ navigate });
          return;
        }

        // Existing account hit during sign-up — transfer to a sign-in.
        if (signUp.isTransferable) {
          await signIn.create({ transfer: true });
          if ((signIn.status as string) === 'complete') {
            await signIn.finalize({ navigate });
            return;
          }
          // Sign-in needs more than the external account (e.g. password/MFA).
          router.push('/sign-in');
          return;
        }

        // New external account during sign-in — transfer to a sign-up.
        if (signIn.isTransferable) {
          await signUp.create({ transfer: true });
          if (signUp.status === 'complete') {
            await signUp.finalize({ navigate });
            return;
          }
          // Extra info required (e.g. name / legal). Send back to sign-up.
          router.push('/sign-up');
          return;
        }

        // Completed sign-up — activate and enter the app.
        if (signUp.status === 'complete') {
          await signUp.finalize({ navigate });
          return;
        }


        const existingSessionId =
          signIn.existingSession?.sessionId ??
          signUp.existingSession?.sessionId;
        if (existingSessionId) {
          await clerk.setActive({ session: existingSessionId, navigate });
          return;
        }

        // Anything else (MFA, new password, first-factor) is handled on the
        // dedicated auth pages.
        router.push('/sign-in');
      } catch (err) {
        // Never strand the user on the callback route. Log for debugging and
        // fall back to the sign-in page so they can retry.
        console.error('SSO callback failed:', err);
        // Allow a retry now that this attempt has failed.
        hasRun.current = false;
        router.push('/sign-in');
      }
    })();
  }, [clerk, signIn, signUp, router]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
      {/* Bot protection may be required when a sign-in transfers to a sign-up. */}
      <div id="clerk-captcha" />
      Finishing sign-in…
    </div>
  );
}
