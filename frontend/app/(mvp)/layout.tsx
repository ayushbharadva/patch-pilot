import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Space_Grotesk, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { AnimatedFavicon } from '@landing/components/layouts/animated-favicon';
import { ThemeProvider } from '@landing/components/layouts/theme-provider';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Providers } from '@/lib/providers';
import { Toaster } from '@/components/ui/sonner';

// Locked typefaces (CLAUDE.md / PROJECT.md / 02-UI-SPEC.md "Typography"):
// Space Grotesk (display/headings), Inter (body/UI), IBM Plex Mono
// (technical strings). Weights are strictly 400/600 — no 300/500/700.
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '600'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '600'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'PatchPilot',
  description: 'Every bug remembers its history.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Theme is managed by next-themes (attribute="class", defaultTheme="dark",
    // enableSystem) — the same provider the marketing site uses — so /app now
    // supports light AND dark with the landing palette in both.
    // suppressHydrationWarning: next-themes stamps the class on <html> client-side.
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative min-h-full flex flex-col font-sans">
        <AnimatedFavicon />
        <ThemeProvider>
          <ClerkProvider>
            {/* Global aurora/particle atmosphere — fixed, behind all content,
                pointer-events-none. Mounted once here so it persists across the
                search/graph views. */}
            <AuroraBackground />
            <Providers>{children}</Providers>
            <Toaster />
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
