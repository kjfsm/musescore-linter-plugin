import { ensureDerived } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";
import { buildIR, K } from "./helpers/irBuilder.js";

describe("ensureDerived — Tier 1 relations", () => {
	it("indexes articulations by chord event id", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.CHORD,
					staff: 0,
					tick: 0,
					measure: 1,
					articulations: ["Staccato"],
				},
				{ kind: K.CHORD, staff: 0, tick: 480, measure: 1 },
			],
		});
		ensureDerived(ir);
		expect(ir.derived).not.toBeNull();
		expect(ir.derived?.articulationsByChordId[0]).toEqual(["Staccato"]);
		expect(ir.derived?.articulationsByChordId[1]).toBeUndefined();
	});

	it("buckets slurs by staff sorted by startTick", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 }],
			slurs: [
				{ staffIdx: 0, voice: 0, startTick: 480, endTick: 960 },
				{ staffIdx: 0, voice: 0, startTick: 0, endTick: 240 },
			],
		});
		ensureDerived(ir);
		const slurs = ir.derived?.slursByStaff[0] ?? [];
		expect(slurs.map((s) => s.startTick)).toEqual([0, 480]);
	});

	it("builds a rhythm signature per staff/measure/voice; identical rhythms match", () => {
		const measure = (staff: number) => [
			{
				kind: K.CHORD,
				staff,
				voice: 0,
				tick: 0,
				measure: 1,
				duration: { numerator: 1, denominator: 4 },
			},
			{
				kind: K.REST,
				staff,
				voice: 0,
				tick: 480,
				measure: 1,
				duration: { numerator: 1, denominator: 4 },
			},
		];
		const ir = buildIR({
			parts: [{ partName: "Vn1" }, { partName: "Vn2" }, { partName: "Va" }],
			events: [
				...measure(0),
				...measure(1),
				{
					kind: K.CHORD,
					staff: 2,
					voice: 0,
					tick: 0,
					measure: 1,
					duration: { numerator: 1, denominator: 2 },
				},
			],
		});
		ensureDerived(ir);
		const r = ir.derived?.rhythmByStaffMeasure ?? {};
		expect(r["0:1:0"]).toBe(r["1:1:0"]);
		expect(r["2:1:0"]).not.toBe(r["0:1:0"]);
	});
});
