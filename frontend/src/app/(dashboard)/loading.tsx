import { LoadingState } from "@/components/shared/loading-state";

export default function DashboardLoading() {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<div className="h-7 w-48 rounded-md bg-muted" />
				<div className="h-4 w-72 rounded-md bg-muted/70" />
			</div>
			<LoadingState label="Reconstructing memory…" className="max-w-2xl" />
		</div>
	);
}
