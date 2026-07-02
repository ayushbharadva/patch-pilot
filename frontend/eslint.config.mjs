import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
	]),
	// Enforce the API_Client_Layer swap boundary (Requirements 7.2, 7.10):
	// components and pages must import lifecycle data only through `@/lib/api`,
	// never directly from the Mock_Data_Layer (`@/lib/mock`).
	{
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@/lib/mock", "@/lib/mock/*"],
							message:
								"Import lifecycle data through `@/lib/api` instead. Only code inside `src/lib/api/` may import `@/lib/mock` directly.",
						},
					],
				},
			],
		},
	},
	// The API_Client_Layer is the single legitimate consumer of the
	// Mock_Data_Layer, so the restriction is lifted for files under `src/lib/api`.
	{
		files: ["src/lib/api/**"],
		rules: {
			"no-restricted-imports": "off",
		},
	},
]);

export default eslintConfig;
