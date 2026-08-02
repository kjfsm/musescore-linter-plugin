import { describe, expect, it } from "vitest";

import {
	assertKnownRules,
	parseArgs,
	resolveEnabledRules,
	UsageError,
} from "../src/args.js";

const RULES = ["opening-tempo", "pizz-arco", "final-barline"];

describe("parseArgs", () => {
	it("フラグでない引数はすべてファイルとして扱う", () => {
		const o = parseArgs(["a.musicxml", "b.mxl"]);
		expect(o.files).toEqual(["a.musicxml", "b.mxl"]);
		expect(o.format).toBe("pretty");
		expect(o.failOn).toBe("error");
	});

	it("-- 以降はフラグに見えてもファイルとして扱う", () => {
		expect(parseArgs(["--", "--weird-name.xml"]).files).toEqual([
			"--weird-name.xml",
		]);
	});

	it("--json は --format=json の別名", () => {
		expect(parseArgs(["--json", "a.xml"]).format).toBe("json");
		expect(parseArgs(["--format=github", "a.xml"]).format).toBe("github");
	});

	it("--rule / --no-rule は複数回指定できる", () => {
		const o = parseArgs([
			"--rule=opening-tempo",
			"--rule=pizz-arco",
			"--no-rule=final-barline",
			"a.xml",
		]);
		expect(o.onlyRules).toEqual(["opening-tempo", "pizz-arco"]);
		expect(o.disabledRules).toEqual(["final-barline"]);
	});

	it("未知のオプションを拒否する", () => {
		expect(() => parseArgs(["--nope"])).toThrow(UsageError);
	});

	it("値が必要なオプションに値が無ければ拒否する", () => {
		expect(() => parseArgs(["--format"])).toThrow(/値が必要です/);
	});

	it("列挙値の候補外を拒否する", () => {
		expect(() => parseArgs(["--fail-on=fatal"])).toThrow(/error \/ warning/);
	});
});

describe("resolveEnabledRules", () => {
	it("指定が無ければ空（= 各 checker の defaultEnabled に従う）", () => {
		expect(
			resolveEnabledRules({ onlyRules: [], disabledRules: [] }, RULES),
		).toEqual({});
	});

	it("--rule があれば指定されたものだけ true にする", () => {
		expect(
			resolveEnabledRules(
				{ onlyRules: ["pizz-arco"], disabledRules: [] },
				RULES,
			),
		).toEqual({
			"opening-tempo": false,
			"pizz-arco": true,
			"final-barline": false,
		});
	});

	it("--no-rule は --rule より後に適用される", () => {
		expect(
			resolveEnabledRules(
				{ onlyRules: ["pizz-arco"], disabledRules: ["pizz-arco"] },
				RULES,
			)["pizz-arco"],
		).toBe(false);
	});
});

describe("assertKnownRules", () => {
	it("存在しない checker id を拒否する", () => {
		expect(() =>
			assertKnownRules({ onlyRules: ["nope"], disabledRules: [] }, RULES),
		).toThrow(/'nope' は存在しません/);
	});

	it("存在する id は通す", () => {
		expect(() =>
			assertKnownRules(
				{ onlyRules: ["pizz-arco"], disabledRules: ["final-barline"] },
				RULES,
			),
		).not.toThrow();
	});
});
