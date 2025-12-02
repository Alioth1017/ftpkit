import { defineConfig } from "tsup";

export default defineConfig([
	// Build CLI
	{
		entry: ["src/cli.ts"],
		format: ["cjs"],
		outDir: "dist",
		clean: true,
		dts: false,
		minify: true,
		splitting: false,
		sourcemap: true,
		banner: {
			js: "#!/usr/bin/env node",
		},
	},
	// Build Library
	{
		entry: ["src/index.ts"],
		format: ["cjs", "esm"],
		outDir: "dist",
		dts: true,
		minify: true,
		clean: false,
		sourcemap: true,
	},
]);
