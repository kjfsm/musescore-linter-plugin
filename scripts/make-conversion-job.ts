import * as fs from "node:fs";
import * as path from "node:path";

/**
 * MuseScore の一括変換ジョブ（`mscore -j job.json`）用の JSON を作る。
 *
 *   tsx scripts/make-conversion-job.ts <入力ディレクトリ> <出力ディレクトリ> [出力先 job.json]
 *
 * 入力ディレクトリ配下の .mscz / .mscx を再帰的に探し、すべて MusicXML へ変換する
 * ジョブを書き出す。出力ファイル名はディレクトリ区切りを `__` に潰して衝突を避ける。
 * 対象が 1 つも無ければ空配列を書き、終了コード 0 で終わる（CI 側でスキップ判定する）。
 */

const SCORE_EXTENSIONS = [".mscz", ".mscx"];

export function findScores(dir: string): string[] {
	if (!fs.existsSync(dir)) return [];
	const found: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			found.push(...findScores(full));
		} else if (
			SCORE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
		) {
			found.push(full);
		}
	}
	return found.sort();
}

export function outputNameFor(inputDir: string, file: string): string {
	const relative = path.relative(inputDir, file);
	const withoutExt = relative.slice(0, -path.extname(relative).length);
	return `${withoutExt.split(path.sep).join("__")}.musicxml`;
}

export function buildJob(
	inputDir: string,
	outputDir: string,
): { in: string; out: string }[] {
	return findScores(inputDir).map((file) => ({
		in: file,
		out: path.join(outputDir, outputNameFor(inputDir, file)),
	}));
}

function main(): void {
	const [inputDir, outputDir, jobPath = "conversion-job.json"] =
		process.argv.slice(2);
	if (!inputDir || !outputDir) {
		console.error(
			"使い方: tsx scripts/make-conversion-job.ts <入力ディレクトリ> <出力ディレクトリ> [job.json]",
		);
		process.exit(2);
	}

	const job = buildJob(inputDir, outputDir);
	fs.mkdirSync(outputDir, { recursive: true });
	fs.mkdirSync(path.dirname(path.resolve(jobPath)), { recursive: true });
	fs.writeFileSync(jobPath, JSON.stringify(job, null, 2), "utf8");

	console.error(
		`${job.length} 件の楽譜を ${outputDir} へ変換するジョブを書きました`,
	);
	// CI から件数を拾えるように標準出力へは件数だけ出す
	console.log(String(job.length));
}

if (process.argv[1]?.endsWith("make-conversion-job.ts")) main();
