"use client";

import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

/**
 * /app/profile — Clerk-managed account page (profile details, connected
 * GitHub/Google accounts, sessions, security). Clerk's dark base theme is
 * applied only when the app resolves dark, so the panel follows the same
 * next-themes toggle as everything else.
 */
export default function ProfilePage() {
  const { resolvedTheme } = useTheme();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-gradient sm:text-3xl">
        Profile
      </h1>
      <p className="mt-1 font-sans text-sm text-muted-foreground">
        Manage your account, connected GitHub/Google logins, and sessions.
      </p>
      <div className="mt-6 flex justify-center">
        <UserProfile
          routing="hash"
          appearance={{
            theme: resolvedTheme === "dark" ? dark : undefined,
            variables: {
              colorPrimary:
                resolvedTheme === "dark" ? "#28c2be" : "#0e8fa5",
              borderRadius: "0.75rem",
            },
            elements: {
              rootBox: "w-full max-w-3xl",
              cardBox: "w-full shadow-none glass",
            },
          }}
        />
      </div>
    </main>
  );
}
