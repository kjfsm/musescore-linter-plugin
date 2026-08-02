import type { Issue } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { summarize, toRows } from "../src/lib/rows";

function issue(over: Partial<Issue> = {}): Issue {
	return {
		ruleId: "opening-tempo",
		severity: "error",
		category: "tempo",
		message: "冒頭にテンポ表記がありません",
		partName: "Violin I",
		staffIdx: 0,
		measure: 1,
		tick: 0,
		detail: null,
		...over,
	};
}

describe("toRows", () => {
	it("メッセージ先頭の重複したパート名を落とす", () => {
		const [row] = toRows([
			issue({ message: "Violin I: 1音目にダイナミクスがありません" }),
		]);
		expect(row.partName).toBe("Violin I");
		expect(row.message).toBe("1音目にダイナミクスがありません");
	});

	it("パート名で始まらないメッセージはそのまま残す", () => {
		expect(toRows([issue()])[0].message).toBe("冒頭にテンポ表記がありません");
	});

	it("同じ位置の同じルールでも key が衝突しない", () => {
		const rows = toRows([issue(), issue()]);
		expect(rows[0].key).not.toBe(rows[1].key);
	});
});

describe("summarize", () => {
	it("複数ファイルをまたいで severity 別に数える", () => {
		const counts = summarize([
			{ file: "a.musicxml", issues: [issue(), issue({ severity: "info" })] },
			{ file: "b.musicxml", issues: [issue({ severity: "warning" })] },
		]);
		expect(counts).toEqual({ error: 1, warning: 1, info: 1 });
	});

	it("issue が無ければ全て 0", () => {
		expect(summarize([{ file: "a.musicxml", issues: [] }])).toEqual({
			error: 0,
			warning: 0,
			info: 0,
		});
	});
});
