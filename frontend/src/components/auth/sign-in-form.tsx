'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

import { Button } from '@landing/components/ui/button';
import { Input } from '@landing/components/ui/input';
import { Label } from '@landing/components/ui/label';
import { Separator } from '@landing/components/ui/separator';

function ClerkError({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

function humanizeClerkError(
  code: string | undefined,
  fallback: string,
): string {
  if (!code) return fallback;
  const map: Record<string, string> = {
    form_identifier_not_found:
      'No account found with that email. Try signing up instead.',
    form_password_incorrect: 'Incorrect password. Please try again.',
    form_code_incorrect: 'The verification code is incorrect.',
    form_param_format_invalid: 'That email address looks invalid.',
    form_param_missing: 'Please fill in all required fields.',
    strategy_not_enabled: 'This sign-in method is not enabled.',
    form_not_found_lenient: 'Account not found. Check your email or sign up.',
  };
  return map[code] ?? fallback;
}

export function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const isBusy =
    fetchStatus === 'fetching' || isSubmitting || oauthLoading !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || isBusy) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const { error: pwError } = await signIn.password({
        emailAddress: email,
        password,
      });

      if (pwError) {
        setError(
          humanizeClerkError(
            pwError.code,
            pwError.longMessage ?? pwError.message ?? 'Sign in failed.',
          ),
        );
        setIsSubmitting(false);
        return;
      }

      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          setError(
            humanizeClerkError(
              finalizeError.code,
              'Could not start your session.',
            ),
          );
          setIsSubmitting(false);
          return;
        }
        router.push('/app');
      } else {
        setError(
          'Additional verification is required for this account. Please complete the flow in a supported client.',
        );
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const clerkErr = err as {
        errors?: Array<{
          code?: string;
          message?: string;
          longMessage?: string;
        }>;
      };
      const first = clerkErr.errors?.[0];
      setError(
        humanizeClerkError(
          first?.code,
          first?.longMessage ?? first?.message ?? 'Sign in failed.',
        ),
      );
      setIsSubmitting(false);
    }
  }

  async function handleOAuth(strategy: 'oauth_google' | 'oauth_github') {
    if (!signIn || isBusy) return;
    setError(null);
    setOauthLoading(strategy);
    try {
      const { error: ssoError } = await signIn.sso({
        strategy,
        redirectUrl: '/sso-callback',
        redirectCallbackUrl: '/app',
      });
      if (ssoError) {
        setError(
          humanizeClerkError(
            ssoError.code,
            `${strategy === 'oauth_google' ? 'Google' : 'GitHub'} sign-in failed.`,
          ),
        );
        setOauthLoading(null);
      }
      // On success, the browser redirects away — no state cleanup needed.
    } catch (err: unknown) {
      const clerkErr = err as {
        errors?: Array<{ code?: string; message?: string }>;
      };
      const first = clerkErr.errors?.[0];
      setError(humanizeClerkError(first?.code, 'OAuth sign-in failed.'));
      setOauthLoading(null);
    }
  }

  // Surface field-level errors from the signal (e.g. invalid identifier).
  const fieldError =
    errors?.fields?.identifier?.message ??
    errors?.fields?.password?.message ??
    null;
  const displayedError = error ?? fieldError;

  return (
    <div className="space-y-5">
      {/* OAuth */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full gap-2.5 rounded-xl border-border/70 bg-background/60 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-elevated/90 cursor-pointer"
          onClick={() => handleOAuth('oauth_google')}
          disabled={isBusy}
        >
          {oauthLoading === 'oauth_google' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon className="size-4" />
          )}
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full gap-2.5 rounded-xl border-border/70 bg-background/60 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-elevated/90 cursor-pointer"
          onClick={() => handleOAuth('oauth_github')}
          disabled={isBusy}
        >
          {oauthLoading === 'oauth_github' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GitHubIcon className="size-4" />
          )}
          GitHub
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs font-medium tracking-[0.25em] text-muted-foreground uppercase">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      {/* Email / password */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="sign-in-email"
            className="text-xs font-semibold tracking-wide text-foreground uppercase"
          >
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground/60" />
            <Input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-12 rounded-xl border-border/70 bg-background/80 pl-10 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/15"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="sign-in-password"
            className="text-xs font-semibold tracking-wide text-foreground uppercase"
          >
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-foreground/60" />
            <Input
              id="sign-in-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-xl border-border/70 bg-background/80 px-10 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-foreground/60 transition-colors hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {displayedError && <ClerkError message={displayedError} />}

        <Button
          type="submit"
          size="lg"
          disabled={isBusy}
          className="group/clerk-btn relative h-12 w-full overflow-hidden rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-[0_18px_36px_-18px_var(--glow)] transition-transform duration-150 ease-out hover:scale-[1.02] hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
