import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";

// Locked typefaces (CLAUDE.md / PROJECT.md / 02-UI-SPEC.md "Typography"):
// Space Grotesk (display/headings), Inter (body/UI), IBM Plex Mono
// (technical strings). Weights are strictly 400/600 — no 300/500/700.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "PatchPilot",
  description: "Every bug remembers its history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Neural-dark by default (260703-vga): `dark` is hardcoded so the elevated
    // dark theme renders with zero JS/hydration dependency AND every component's
    // `dark:` utility variants stay active. suppressHydrationWarning guards the
    // <html> attribute set from any client theming that may run later.
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative min-h-full flex flex-col font-sans">
        {/* Global aurora/particle atmosphere — fixed, behind all content,
            pointer-events-none. Mounted once here so it persists across the
            search/graph views. */}
        <AuroraBackground />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
