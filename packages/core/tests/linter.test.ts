import { beforeEach, describe, expect, it } from "vitest";
import { register, reset } from "../src/checkerRegistry.js";
import { CANONICAL } from "../src/enumRegistry.js";
import { ensureDerived, runAllCheckers } from "../src/linter.js";
import type { Checker, LintIR } from "../src/types.js";

function minimalIR(): LintIR {
	return {
		events: [],
		index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
		meta: {
			parts: [],
			firstMusicTickByStaff: [],
			lastTick: 0,
			hairpins: [],
			slurs: [],
			ties: [],
		},
		registry: { canonical: CANONICAL },
		derived: null,
	};
}

function mockChecker(id: string, issues = 0): Checker {
	return {
		id,
		name: id,
		description: "",
		category: "test",
		severity: "warning",
		defaultEnabled: true,
		run: () =>
			Array.from({ length: issues }, (_, i) => ({
				ruleId: id,
				severity: "warning" as const,
				category: "test",
				message: `issue ${i}`,
				partName: "",
				staffIdx: -1,
				measure: 1,
				tick: 0,
				detail: null,
			})),
	};
}

describe("runAllCheckers", () => {
	beforeEach(() => reset());

	it("登録された checker を実行し issue を返す", () => {
		register(mockChecker("a", 2));
		register(mockChecker("b", 1));
		const issues = runAllCheckers(minimalIR());
		expect(issues).toHaveLength(3);
	});

	it("enabledRules で無効化できる", () => {
		register(mockChecker("a", 2));
		const issues = runAllCheckers(minimalIR(), { a: false });
		expect(issues).toHaveLength(0);
	});

	it("checker が例外を投げても他の checker は動く", () => {
		register({
			...mockChecker("bad"),
			run() {
				throw new Error("boom");
			},
		});
		register(mockChecker("good", 1));
		const issues = runAllCheckers(minimalIR());
		expect(issues.some((i) => i.ruleId === "internal")).toBe(true);
		expect(issues.some((i) => i.ruleId === "good")).toBe(true);
	});
});

describe("ensureDerived", () => {
	it("firstChordByStaff を計算する", () => {
		const ir = minimalIR();
		ir.events.push({
			id: 0,
			tick: 480,
			measure: 2,
			staffIdx: 0,
			voice: 0,
			kind: CANONICAL.elementKinds.CHORD,
			type: "chord",
			textNorm: "",
			textRaw: "",
			scope: "staff",
			subtype: null,
			subStyle: null,
			tempo: null,
		});
		ir.index.byKind[CANONICAL.elementKinds.CHORD] = [0];
		ensureDerived(ir);
		expect(ir.derived?.firstChordByStaff[0]).toEqual({ tick: 480, measure: 2 });
	});

	it("キャッシュが有効なら再計算しない", () => {
		const ir = minimalIR();
		ensureDerived(ir);
		const derived1 = ir.derived;
		ensureDerived(ir);
		expect(ir.derived).toBe(derived1);
	});

	it("rhythmByStaffMeasure は同じ長さでも chord と rest を区別する", () => {
		const ir = minimalIR();
		ir.events.push(
			{
				id: 0,
				tick: 0,
				measure: 1,
				staffIdx: 0,
				voice: 0,
				kind: CANONICAL.elementKinds.CHORD,
				type: "chord",
				textNorm: "",
				textRaw: "",
				scope: "staff",
				subtype: null,
				subStyle: null,
				tempo: null,
				duration: { numerator: 1, denominator: 4 },
			},
			{
				id: 1,
				tick: 0,
				measure: 1,
				staffIdx: 1,
				voice: 0,
				kind: CANONICAL.elementKinds.REST,
				type: "rest",
				textNorm: "",
				textRaw: "",
				scope: "staff",
				subtype: null,
				subStyle: null,
				tempo: null,
				duration: { numerator: 1, denominator: 4 },
			},
		);
		ir.index.byKind[CANONICAL.elementKinds.CHORD] = [0];
		ir.index.byKind[CANONICAL.elementKinds.REST] = [1];
		ensureDerived(ir);
		expect(ir.derived?.rhythmByStaffMeasure["0:1:0"]).not.toBe(
			ir.derived?.rhythmByStaffMeasure["1:1:0"],
		);
	});
});
