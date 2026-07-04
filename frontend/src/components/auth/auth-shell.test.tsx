import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs', () => ({
  useSignIn: () => ({
    signIn: {
      password: vi.fn().mockResolvedValue({ error: null }),
      sso: vi.fn().mockResolvedValue({ error: null }),
      finalize: vi.fn().mockResolvedValue({ error: null }),
      status: 'complete',
    },
    errors: { fields: {}, raw: null, global: null },
    fetchStatus: 'idle',
  }),
  useSignUp: () => ({
    signUp: {
      password: vi.fn().mockResolvedValue({ error: null }),
      sso: vi.fn().mockResolvedValue({ error: null }),
      finalize: vi.fn().mockResolvedValue({ error: null }),
      status: 'complete',
      verifications: {
        sendEmailCode: vi.fn().mockResolvedValue({ error: null }),
        verifyEmailCode: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    errors: { fields: {}, raw: null, global: null },
    fetchStatus: 'idle',
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

import { AuthShell } from './auth-shell';

describe('AuthShell', () => {
  it('renders the sign-in experience', () => {
    render(<AuthShell mode="sign-in" />);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('renders the sign-up experience', () => {
    render(<AuthShell mode="sign-up" />);

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeInTheDocument();
  });
});
