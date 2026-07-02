"use client";

import { useState } from "react";

import type { LifecycleAction } from "@/types";
import { type MockScenarioState, setScenario } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATES: readonly MockScenarioState[] = ["success", "delayed", "error"];

const STATE_LABELS: Record<MockScenarioState, string> = {
	success: "Success",
	delayed: "Delayed",
	error: "Error",
};

interface ScenarioSwitchProps {
	action: LifecycleAction;
}

export function ScenarioSwitch({ action }: ScenarioSwitchProps) {
	const [active, setActive] = useState<MockScenarioState>("success");

	return (
		<div className="flex items-center gap-2">
			<span className="text-xs text-muted-foreground">Demo scenario</span>
			<div
				role="group"
				aria-label="Demo scenario"
				className="inline-flex rounded-lg border border-border bg-card p-0.5"
			>
				{STATES.map((state) => (
					<button
						key={state}
						type="button"
						aria-pressed={active === state}
						onClick={() => {
							setScenario(action, state);
							setActive(state);
						}}
						className={cn(
							"rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
							active === state
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{STATE_LABELS[state]}
					</button>
				))}
			</div>
		</div>
	);
}
