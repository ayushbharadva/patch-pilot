"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";

interface DashboardErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex min-h-[50vh] items-center justify-center">
			<ErrorState
				error="This section hit an unexpected error. Your memory data is safe — try again."
				onRetry={reset}
				className="max-w-md"
			/>
		</div>
	);
}
