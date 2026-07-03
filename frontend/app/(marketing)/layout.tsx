import type { Metadata } from "next";
import "@landing/globals.css";
import { fontVariables } from "@landing/lib/fonts";
import { ThemeProvider } from "@landing/components/layouts/theme-provider";
import { SITE_CONFIG } from "@landing/config/site";
import { Toaster } from "@landing/components/ui/sonner";
import { TooltipProvider } from "@landing/components/ui/tooltip";

export const metadata: Metadata = {
	metadataBase: new URL(SITE_CONFIG.url),
	title: {
		default: `${SITE_CONFIG.name} · ${SITE_CONFIG.tagline}`,
		template: `%s · ${SITE_CONFIG.name}`,
	},
	description: SITE_CONFIG.description,
	applicationName: SITE_CONFIG.name,
	keywords: [
		"incident memory",
		"Cognee",
		"root cause analysis",
		"memory graph",
		"knowledge drift",
		"postmortem",
		"observability",
	],
	openGraph: {
		type: "website",
		url: SITE_CONFIG.url,
		siteName: SITE_CONFIG.name,
		title: `${SITE_CONFIG.name} · ${SITE_CONFIG.tagline}`,
		description: SITE_CONFIG.description,
	},
	twitter: {
		card: "summary_large_image",
		title: `${SITE_CONFIG.name} · ${SITE_CONFIG.tagline}`,
		description: SITE_CONFIG.description,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${fontVariables} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<ThemeProvider>
					<TooltipProvider delay={200}>
						{children}
						<Toaster richColors position="bottom-right" />
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
