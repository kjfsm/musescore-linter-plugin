#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { EXIT_ERROR, run } from "./run.js";

function main(): void {
	const code = run(process.argv.slice(2), {
		readFile: (path) => readFileSync(path),
		stdout: (text) => {
			if (text !== "") process.stdout.write(`${text}\n`);
		},
		stderr: (text) => {
			if (text !== "") process.stderr.write(`${text}\n`);
		},
	});
	process.exitCode = code;
}

try {
	main();
} catch (error) {
	process.stderr.write(
		`予期しないエラー: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
	);
	process.exitCode = EXIT_ERROR;
}
