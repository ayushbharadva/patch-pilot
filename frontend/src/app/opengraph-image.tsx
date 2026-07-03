import { ImageResponse } from "next/og";

import { SITE_CONFIG } from "@/config/site";

export const alt = `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "80px",
				background:
					"radial-gradient(1000px 600px at 15% 0%, #12303a 0%, #0b0f17 55%), #0b0f17",
				color: "#e6edf4",
				fontFamily: "sans-serif",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
				<div
					style={{
						display: "flex",
						width: "64px",
						height: "64px",
						borderRadius: "16px",
						alignItems: "center",
						justifyContent: "center",
						background:
							"linear-gradient(135deg, #22d3ee 0%, #4aa3f0 55%, #8b7bf0 100%)",
						position: "relative",
					}}
				>
					{/* Memory graph logo */}
					<svg viewBox="0 0 36 36" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
						<line x1="18" y1="18" x2="8" y2="9" stroke="#0b0f17" strokeWidth="1.5" strokeOpacity="0.5" />
						<line x1="18" y1="18" x2="28" y2="9" stroke="#0b0f17" strokeWidth="1.5" strokeOpacity="0.5" />
						<line x1="18" y1="18" x2="18" y2="30" stroke="#0b0f17" strokeWidth="1.5" strokeOpacity="0.5" />
						<circle cx="8" cy="9" r="3" fill="#0b0f17" fillOpacity="0.7" />
						<circle cx="28" cy="9" r="3" fill="#0b0f17" fillOpacity="0.7" />
						<circle cx="18" cy="30" r="3" fill="#0b0f17" fillOpacity="0.7" />
						<circle cx="18" cy="18" r="5" fill="#0b0f17" />
					</svg>
				</div>
				<div
					style={{
						fontSize: "32px",
						fontWeight: 700,
						letterSpacing: "-0.02em",
					}}
				>
					{SITE_CONFIG.name}
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "14px",
						fontSize: "22px",
						color: "#3ad6c6",
						fontWeight: 600,
						letterSpacing: "0.12em",
						textTransform: "uppercase",
					}}
				>
					Living incident memory
				</div>
				<div
					style={{
						fontSize: "76px",
						fontWeight: 700,
						lineHeight: 1.05,
						letterSpacing: "-0.03em",
						maxWidth: "960px",
					}}
				>
					Remembers past fixes. Diagnoses new bugs.
				</div>
				<div
					style={{
						fontSize: "30px",
						color: "#8a97a6",
						maxWidth: "900px",
						lineHeight: 1.35,
					}}
				>
					Recall, diagnose, and forget — an incident console built on Cognee.
				</div>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "16px",
					fontSize: "24px",
					color: "#8a97a6",
				}}
			>
				<div
					style={{
						display: "flex",
						width: "12px",
						height: "12px",
						borderRadius: "9999px",
						background: "#3ad6c6",
					}}
				/>
				patchpilot.dev
			</div>
		</div>,
		{ ...size },
	);
}
