import {
  Activity,
  Eraser,
  House,
  ScanSearch,
  Upload,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

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
  {
    label: "Ingest",
    href: "/ingest",
    icon: Upload,
    description: "Feed incidents, postmortems, and fixes into memory",
  },
  {
    label: "Recall",
    href: "/recall",
    icon: ScanSearch,
    description: "Diagnose a new bug from the evidence of past incidents",
  },
  {
    label: "Graph",
    href: "/graph",
    icon: Waypoints,
    description: "Explore the memory graph of incidents, fixes, and components",
  },
  {
    label: "Drift",
    href: "/drift",
    icon: Activity,
    description: "Flag memories that are aging or drifting after a release",
  },
  {
    label: "Forget",
    href: "/forget",
    icon: Eraser,
    description: "Retire outdated workarounds and reset the demo",
  },
] as const satisfies readonly NavItem[];

export const SITE_CONFIG = {
  name: "PatchPilot",
  shortName: "PatchPilot",
  tagline: "Your incidents, remembered.",
  description:
    "PatchPilot is a living incident-memory system built on Cognee that recalls past fixes, diagnoses new bugs from prior evidence, and forgets outdated workarounds.",
  url: "https://patchpilot.dev",
  ogImage: "/opengraph-image",
  launchHref: "/ingest",
  nav,
  dashboardNav: nav.filter((item) => item.href !== "/"),
} as const satisfies SiteConfig;

export const siteConfig = SITE_CONFIG;
