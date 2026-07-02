import { DiagnosisPreview } from "@/components/sections/diagnosis-preview";
import { DriftPreview } from "@/components/sections/drift-preview";
import { FinalCta } from "@/components/sections/final-cta";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";

export default function LandingPage() {
	return (
		<div className="overflow-x-hidden">
			<Hero />
			<HowItWorks />
			<DiagnosisPreview />
			<DriftPreview />
			<FinalCta />
		</div>
	);
}
