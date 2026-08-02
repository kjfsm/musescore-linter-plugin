import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Issue, LintIR } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { formatGithub, formatPretty, meetsThreshold } from "../src/format.js";
import {
	EXIT_ERROR,
	EXIT_ISSUES,
	EXIT_OK,
	type RunIO,
	run,
} from "../src/run.js";

const DUET = join(
	__dirname,
	"..",
	"..",
	"source-musicxml",
	"tests",
	"fixtures",
	"duet.musicxml",
);
const duetBytes = readFileSync(DUET);

interface Captured {
	code: number;
	out: string;
	err: string;
}

function invoke(
	argv: string[],
	files: Record<string, Uint8Array> = {},
): Captured {
	const out: string[] = [];
	const err: string[] = [];
	const io: RunIO = {
		readFile: (path) => {
			const known = files[path];
			if (known) return known;
			if (path === "duet.musicxml") return duetBytes;
			throw new Error(`ENOENT: ${path}`);
		},
		stdout: (t) => out.push(t),
		stderr: (t) => err.push(t),
	};
	return { code: run(argv, io), out: out.join("\n"), err: err.join("\n") };
}

describe("run: 基本動作", () => {
	it("--help は使い方を出して 0 で終わる", () => {
		const r = invoke(["--help"]);
		expect(r.code).toBe(EXIT_OK);
		expect(r.out).toContain("musescore-lint");
		expect(r.out).toContain("--fail-on");
	});

	it("ファイル未指定はエラー扱い（終了コード 2）", () => {
		const r = invoke([]);
		expect(r.code).toBe(EXIT_ERROR);
		expect(r.err).toContain("ファイルを指定してください");
	});

	it("--list-rules は checker 一覧を出す", () => {
		const r = invoke(["--list-rules"]);
		expect(r.code).toBe(EXIT_OK);
		expect(r.out).toContain("opening-tempo");
		expect(r.out).toContain("pizz-arco");
		expect(r.out.split("\n").length).toBeGreaterThan(20);
	});

	it("読めないファイルは終了コード 2 と理由を返す", () => {
		const r = invoke(["missing.musicxml"]);
		expect(r.code).toBe(EXIT_ERROR);
		expect(r.err).toContain("missing.musicxml");
	});

	it("MusicXML でないファイルはパースエラーを報告する", () => {
		const r = invoke(["bad.xml"], {
			"bad.xml": new TextEncoder().encode("<html/>"),
		});
		expect(r.code).toBe(EXIT_ERROR);
		expect(r.err).toContain("score-partwise");
	});
});

describe("run: 解析結果", () => {
	it("fixture を解析して仕込んだ記譜ミスを検出する", () => {
		const r = invoke(["duet.musicxml"]);
		expect(r.out).toContain("duet.musicxml");
		// Violin II の G3→A3 の異音程タイ
		expect(r.out).toContain("tie-pitch-mismatch");
		// Violin I の m.1 Eb → m.2 E ナチュラル
		expect(r.out).toContain("courtesy-accidental");
		// 到達先の強弱記号が無いクレッシェンド
		expect(r.out).toContain("hairpin-target-dynamic");
		// 既定の --fail-on=error では error が無いので 0
		expect(r.code).toBe(EXIT_OK);
	});

	it("--json は summary と results を持つ JSON を返す", () => {
		const r = invoke(["--json", "duet.musicxml"]);
		const parsed = JSON.parse(r.out) as {
			summary: { files: number; issues: number };
			results: { file: string; issues: Issue[] }[];
		};
		expect(parsed.summary.files).toBe(1);
		expect(parsed.results[0].file).toBe("duet.musicxml");
		expect(parsed.summary.issues).toBe(parsed.results[0].issues.length);
	});

	it("--dump-ir は LintIR をそのまま JSON で返す", () => {
		const r = invoke(["--dump-ir", "duet.musicxml"]);
		expect(r.code).toBe(EXIT_OK);
		const ir = JSON.parse(r.out) as LintIR;
		expect(ir.meta.parts).toHaveLength(2);
		expect(ir.events.length).toBeGreaterThan(0);
		expect(ir.registry.canonical.elementKinds.CHORD).toBe("chord");
	});

	it("--rule で 1 つの checker だけに絞れる", () => {
		const r = invoke(["--json", "--rule=tie-pitch-mismatch", "duet.musicxml"]);
		const parsed = JSON.parse(r.out) as {
			results: { issues: Issue[] }[];
		};
		const ids = new Set(parsed.results[0].issues.map((i) => i.ruleId));
		expect([...ids]).toEqual(["tie-pitch-mismatch"]);
	});

	it("--no-rule で個別に無効化できる", () => {
		const all = JSON.parse(invoke(["--json", "duet.musicxml"]).out) as {
			results: { issues: Issue[] }[];
		};
		const without = JSON.parse(
			invoke(["--json", "--no-rule=tie-pitch-mismatch", "duet.musicxml"]).out,
		) as { results: { issues: Issue[] }[] };
		expect(
			all.results[0].issues.some((i) => i.ruleId === "tie-pitch-mismatch"),
		).toBe(true);
		expect(
			without.results[0].issues.some((i) => i.ruleId === "tie-pitch-mismatch"),
		).toBe(false);
	});

	it("存在しない checker id は終了コード 2", () => {
		const r = invoke(["--rule=nope", "duet.musicxml"]);
		expect(r.code).toBe(EXIT_ERROR);
		expect(r.err).toContain("'nope' は存在しません");
	});
});

describe("run: 終了コードと閾値", () => {
	it("--fail-on=none はつねに 0", () => {
		expect(invoke(["--fail-on=none", "duet.musicxml"]).code).toBe(EXIT_OK);
	});

	it("閾値を下げると warning / info でも 1 になる", () => {
		expect(invoke(["--fail-on=warning", "duet.musicxml"]).code).toBe(
			EXIT_ISSUES,
		);
		expect(invoke(["--fail-on=info", "duet.musicxml"]).code).toBe(EXIT_ISSUES);
	});

	it("info しか出ない指定なら --fail-on=warning でも 0", () => {
		expect(invoke(["--rule=courtesy-accidental", "duet.musicxml"]).code).toBe(
			EXIT_OK,
		);
		expect(
			invoke([
				"--fail-on=warning",
				"--rule=courtesy-accidental",
				"duet.musicxml",
			]).code,
		).toBe(EXIT_OK);
	});

	it("閾値を満たす issue が無ければ 0", () => {
		// info しか出さない checker に絞れば --fail-on=error では 0
		const r = invoke(["--rule=final-barline", "duet.musicxml"]);
		expect(r.code).toBe(EXIT_OK);
	});

	it("ファイルが読めなかった場合は issue の有無に関わらず 2", () => {
		const r = invoke(["--fail-on=none", "duet.musicxml", "missing.xml"]);
		expect(r.code).toBe(EXIT_ERROR);
	});
});

describe("format", () => {
	const issues: Issue[] = [
		{
			ruleId: "opening-tempo",
			severity: "error",
			category: "tempo",
			message: "冒頭にテンポ表記がありません",
			partName: "Violin I",
			staffIdx: 0,
			measure: 1,
			tick: 0,
			detail: null,
		},
		{
			ruleId: "final-barline",
			severity: "info",
			category: "notation",
			message: "曲末が終止線になっていません",
			partName: "Violin I",
			staffIdx: 0,
			measure: 12,
			tick: 100,
			detail: null,
		},
	];

	it("meetsThreshold は severity の重さで判定する", () => {
		expect(meetsThreshold("warning", "error")).toBe(false);
		expect(meetsThreshold("error", "warning")).toBe(true);
		expect(meetsThreshold("info", "info")).toBe(true);
		expect(meetsThreshold("error", "none")).toBe(false);
	});

	it("pretty は色なしなら ANSI を含まない", () => {
		const text = formatPretty([{ file: "a.musicxml", issues }], false);
		// oxlint-disable-next-line no-control-regex -- ANSI エスケープが無いことの確認
		expect(text).not.toMatch(/\[/);
		expect(text).toContain("m.1");
		expect(text).toContain("[opening-tempo]");
		expect(text).toContain("error 1, warning 0, info 1");
	});

	it("pretty は issue が無ければその旨を出す", () => {
		expect(formatPretty([{ file: "a.musicxml", issues: [] }], false)).toContain(
			"問題は見つかりませんでした",
		);
	});

	it("pretty はメッセージ先頭の重複したパート名を落とす", () => {
		const text = formatPretty(
			[
				{
					file: "a.musicxml",
					issues: [
						{
							...issues[0],
							message: "Violin I: 1音目にダイナミクスがありません",
						},
					],
				},
			],
			false,
		);
		expect(text).toContain("Violin I 1音目にダイナミクスがありません");
		expect(text).not.toContain("Violin I: 1音目");
	});

	it("github は severity をアノテーションレベルに写す", () => {
		const lines = formatGithub([{ file: "a.musicxml", issues }]).split("\n");
		expect(lines[0]).toBe(
			"::error file=a.musicxml,title=opening-tempo::冒頭にテンポ表記がありません",
		);
		expect(lines[1]).toMatch(/^::notice /);
	});

	it("github はプロパティ中の , と : をエスケープする", () => {
		const text = formatGithub([
			{
				file: "dir/a,b:c.musicxml",
				issues: [{ ...issues[0], message: "改行\nを含む" }],
			},
		]);
		expect(text).toContain("file=dir/a%2Cb%3Ac.musicxml");
		expect(text).toContain("改行%0Aを含む");
	});
});
