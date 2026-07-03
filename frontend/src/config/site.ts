import { House, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export interface SiteConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  url: string;
  ogImage: string;
  launchHref: string;
  nav: readonly NavItem[];
  dashboardNav: readonly NavItem[];
}

const nav = [
  {
    label: "Home",
    href: "/",
    icon: House,
    description: "PatchPilot overview and the living incident-memory story",
  },
] as const satisfies readonly NavItem[];

export const SITE_CONFIG = {
  name: "PatchPilot",
  shortName: "PatchPilot",
  tagline: "Your incidents, remembered.",
  description:
    "PatchPilot is a living incident-memory system built on Cognee that recalls past fixes, diagnoses new bugs from prior evidence, and forgets outdated workarounds after each release.",
  url: "https://patchpilot.dev",
  ogImage: "/opengraph-image",
  launchHref: "/#how-it-works",
  nav,
  dashboardNav: [] as const,
} as const satisfies SiteConfig;

export const siteConfig = SITE_CONFIG;
