import { ensureDerived, type LintIR } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";
import { articulationSlurConsistencyChecker } from "../src/articulationSlurConsistencyChecker.js";
import { buildIR, K } from "./helpers/irBuilder.js";

const run = (ir: LintIR) => {
	ensureDerived(ir);
	return articulationSlurConsistencyChecker.run(ir);
};

const q = { numerator: 1, denominator: 4 };

describe("articulation-slur-consistency", () => {
	it("同リズムで記号が一致していれば検出しない", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
			events: [
				{
					kind: K.CHORD,
					staff: 0,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["Staccato"],
				},
				{
					kind: K.CHORD,
					staff: 0,
					voice: 0,
					tick: 480,
					measure: 1,
					duration: q,
				},
				{
					kind: K.CHORD,
					staff: 1,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["Staccato"],
				},
				{
					kind: K.CHORD,
					staff: 1,
					voice: 0,
					tick: 480,
					measure: 1,
					duration: q,
				},
			],
		});
		expect(run(ir)).toHaveLength(0);
	});

	it("同リズムでアーティキュレーションが食い違うと info を出す", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
			events: [
				{
					kind: K.CHORD,
					staff: 0,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["Staccato"],
				},
				{ kind: K.CHORD, staff: 1, voice: 0, tick: 0, measure: 1, duration: q },
			],
		});
		const issues = run(ir);
		expect(issues).toHaveLength(1);
		const [issue] = issues;
		expect(issue?.staffIdx).toBe(1);
		expect(issue?.severity).toBe("info");
	});

	it("同リズムでスラー被覆が食い違うと検出する", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
			events: [
				{ kind: K.CHORD, staff: 0, voice: 0, tick: 0, measure: 1, duration: q },
				{ kind: K.CHORD, staff: 1, voice: 0, tick: 0, measure: 1, duration: q },
			],
			slurs: [{ staffIdx: 0, voice: 0, startTick: 0, endTick: 480 }],
		});
		expect(run(ir)).toHaveLength(1);
	});

	it("上/下スタッカートなど配置違いは同一視して検出しない", () => {
		const ir = buildIR({
			parts: [{ partName: "Vc" }, { partName: "Cb" }],
			events: [
				{
					kind: K.CHORD,
					staff: 0,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["上スタッカート"],
				},
				{
					kind: K.CHORD,
					staff: 1,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["下スタッカート"],
				},
			],
		});
		expect(run(ir)).toHaveLength(0);
	});

	it("正規化しても異なるアーティキュレーションなら検出する", () => {
		const ir = buildIR({
			parts: [{ partName: "Vc" }, { partName: "Cb" }],
			events: [
				{
					kind: K.CHORD,
					staff: 0,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["上スタッカート"],
				},
				{
					kind: K.CHORD,
					staff: 1,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["上アクセント"],
				},
			],
		});
		expect(run(ir)).toHaveLength(1);
	});

	it("リズムが異なるパートは比較しない", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
			events: [
				{
					kind: K.CHORD,
					staff: 0,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["Staccato"],
				},
				{
					kind: K.CHORD,
					staff: 1,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: { numerator: 1, denominator: 2 },
				},
			],
		});
		expect(run(ir)).toHaveLength(0);
	});

	it("同じ長さでも一方が休符なら同じリズムとみなさない", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
			events: [
				{
					kind: K.CHORD,
					staff: 0,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
					articulations: ["Staccato"],
				},
				{
					kind: K.REST,
					staff: 1,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: q,
				},
			],
		});
		expect(run(ir)).toHaveLength(0);
	});
});
