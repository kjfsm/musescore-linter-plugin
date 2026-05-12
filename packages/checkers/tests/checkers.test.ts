import { ensureDerived, reset, runAllCheckers } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";
import { divisiChecker } from "../src/divisiChecker.js";
import { duplicateDynamicsChecker } from "../src/duplicateDynamicsChecker.js";
import { finalBarlineChecker } from "../src/finalBarlineChecker.js";
import { firstNoteDynamicsChecker } from "../src/firstNoteDynamicsChecker.js";
import { registerAll } from "../src/index.js";
import { openingTempoChecker } from "../src/openingTempoChecker.js";
import { pizzArcoChecker } from "../src/pizzArcoChecker.js";
import { restAnnotationChecker } from "../src/restAnnotationChecker.js";
import { soloTuttiChecker } from "../src/soloTuttiChecker.js";
import { sordinoChecker } from "../src/sordinoChecker.js";
import { tempoBarlineChecker } from "../src/tempoBarlineChecker.js";
import { tempoWithoutBpmChecker } from "../src/tempoWithoutBpmChecker.js";
import { BK, buildIR, cleanIR, K } from "./helpers/irBuilder.js";

function run(
	ir: ReturnType<typeof buildIR>,
	enabledRules: Record<string, boolean> = {},
) {
	reset();
	registerAll();
	ensureDerived(ir);
	return runAllCheckers(ir, enabledRules);
}

// ─── クリーン fixture ───────────────────────────────────────────────────────

describe("clean fixture", () => {
	it("全 checker が 0 件", () => {
		const issues = run(cleanIR());
		expect(issues).toHaveLength(0);
	});
});

// ─── opening-tempo ──────────────────────────────────────────────────────────

describe("opening-tempo checker", () => {
	it("冒頭テンポなし → error 1件", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
			],
		});
		ensureDerived(ir);
		const issues = openingTempoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("error");
	});

	it("global scope の tempo があれば pass", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.TEMPO_TEXT,
					staffIdx: -1,
					scope: "global",
					tick: 0,
					measure: 1,
					tempo: 2.0,
					textNorm: "allegro",
					textRaw: "Allegro",
				},
				{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
			],
		});
		expect(openingTempoChecker.run(ir)).toHaveLength(0);
	});
});

// ─── first-note-dynamics ────────────────────────────────────────────────────

describe("first-note-dynamics checker", () => {
	it("Vn2 の1音目にダイナミクスなし → error 1件", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
			events: [
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 0,
					measure: 1,
					tempo: 2.0,
					textNorm: "allegro",
					textRaw: "Allegro",
				},
				{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
				{ kind: K.CHORD, staff: 1, tick: 0, measure: 1 },
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
			],
		});
		ensureDerived(ir);
		const issues = firstNoteDynamicsChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].partName).toBe("Vn2");
	});
});

// ─── pizz-arco ──────────────────────────────────────────────────────────────

describe("pizz-arco checker", () => {
	it("pizz. のまま曲が終わる → warning 1件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "pizz.",
				textRaw: "pizz.",
			},
		]);
		const issues = pizzArcoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("warning");
	});

	it("pizz. 連続指示 → warning 1件（前回小節が記録される）", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "pizz.",
				textRaw: "pizz.",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "pizz.",
				textRaw: "pizz.",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 1440,
				measure: 4,
				textNorm: "arco",
				textRaw: "arco",
			},
		]);
		const issues = pizzArcoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].detail?.previousMeasure).toBe(2);
	});

	it("pizz. → arco ペア対応済み → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "pizz.",
				textRaw: "pizz.",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "arco",
				textRaw: "arco",
			},
		]);
		expect(pizzArcoChecker.run(ir)).toHaveLength(0);
	});
});

// ─── sordino ────────────────────────────────────────────────────────────────

describe("sordino checker", () => {
	it("con sord. のまま終わる → warning 1件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "con sord.",
				textRaw: "con sord.",
			},
		]);
		expect(sordinoChecker.run(ir)).toHaveLength(1);
	});

	it("con sord. → senza sord. で解除 → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "con sord.",
				textRaw: "con sord.",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "senza sord.",
				textRaw: "senza sord.",
			},
		]);
		expect(sordinoChecker.run(ir)).toHaveLength(0);
	});
});

// ─── rest-annotation ────────────────────────────────────────────────────────

describe("rest-annotation checker", () => {
	it("休符の位置に強弱記号 → error 1件", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 0,
					measure: 1,
					tempo: 2.0,
					textNorm: "allegro",
					textRaw: "Allegro",
				},
				{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
				{ kind: K.REST, staff: 0, tick: 480, measure: 2 },
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 480,
					measure: 2,
					textNorm: "p",
					textRaw: "p",
				},
			],
		});
		expect(restAnnotationChecker.run(ir)).toHaveLength(1);
	});
});

// ─── tempo-barline ──────────────────────────────────────────────────────────

describe("tempo-barline checker", () => {
	it("テンポ変更前に複縦線なし → info 1件", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 0,
					measure: 1,
					tempo: 2.0,
					textNorm: "allegro",
					textRaw: "Allegro",
				},
				{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
				{ kind: K.CHORD, staff: 0, tick: 480, measure: 2 },
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 960,
					measure: 3,
					tempo: 3.0,
					textNorm: "presto",
					textRaw: "Presto",
				},
				{ kind: K.CHORD, staff: 0, tick: 960, measure: 3 },
			],
		});
		const issues = tempoBarlineChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("info");
	});

	it("テンポ変更前に複縦線あり → 0件", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 0,
					measure: 1,
					tempo: 2.0,
					textNorm: "allegro",
					textRaw: "Allegro",
				},
				{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
				{ kind: K.CHORD, staff: 0, tick: 480, measure: 2 },
				{
					kind: K.BAR_LINE,
					staff: 0,
					tick: 958,
					measure: 2,
					barlineKind: BK.DOUBLE,
				},
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 960,
					measure: 3,
					tempo: 3.0,
					textNorm: "presto",
					textRaw: "Presto",
				},
				{ kind: K.CHORD, staff: 0, tick: 960, measure: 3 },
			],
		});
		expect(tempoBarlineChecker.run(ir)).toHaveLength(0);
	});
});

// ─── solo-tutti ─────────────────────────────────────────────────────────────

describe("solo-tutti checker", () => {
	it("solo のまま曲が終わる → warning 1件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "solo",
				textRaw: "solo",
			},
		]);
		expect(soloTuttiChecker.run(ir)).toHaveLength(1);
	});

	it("solo 連続指示 → warning 1件（前回小節が記録される）", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "solo",
				textRaw: "solo",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "solo",
				textRaw: "solo",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 1440,
				measure: 4,
				textNorm: "tutti",
				textRaw: "tutti",
			},
		]);
		const issues = soloTuttiChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].detail?.previousMeasure).toBe(2);
	});

	it("solo → tutti ペア対応済み → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "solo",
				textRaw: "solo",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "tutti",
				textRaw: "tutti",
			},
		]);
		expect(soloTuttiChecker.run(ir)).toHaveLength(0);
	});
});

// ─── div-unis ────────────────────────────────────────────────────────────────

describe("div-unis checker", () => {
	it("div. のまま曲が終わる → warning 1件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "div.",
				textRaw: "div.",
			},
		]);
		expect(divisiChecker.run(ir)).toHaveLength(1);
	});

	it("div. 連続指示 → warning 1件（前回小節が記録される）", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "div.",
				textRaw: "div.",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "div.",
				textRaw: "div.",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 1440,
				measure: 4,
				textNorm: "unis.",
				textRaw: "unis.",
			},
		]);
		const issues = divisiChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].detail?.previousMeasure).toBe(2);
	});

	it("div. → unis. ペア対応済み → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "div.",
				textRaw: "div.",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "unis.",
				textRaw: "unis.",
			},
		]);
		expect(divisiChecker.run(ir)).toHaveLength(0);
	});
});

// ─── tempo-without-bpm ──────────────────────────────────────────────────────

describe("tempo-without-bpm checker", () => {
	it("BPM 値なしテンポ → warning 1件", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "allegro",
					textRaw: "Allegro",
				},
				{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
			],
		});
		const issues = tempoWithoutBpmChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("warning");
	});

	it("BPM 値あり → 0件", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 0,
					measure: 1,
					tempo: 2.0,
					textNorm: "allegro",
					textRaw: "Allegro",
				},
			],
		});
		expect(tempoWithoutBpmChecker.run(ir)).toHaveLength(0);
	});

	it("global scope の BPM なしテンポも検出", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.TEMPO_TEXT,
					staffIdx: -1,
					scope: "global",
					tick: 0,
					measure: 1,
					textNorm: "lento",
					textRaw: "Lento",
				},
			],
		});
		expect(tempoWithoutBpmChecker.run(ir)).toHaveLength(1);
	});
});

// ─── duplicate-dynamics ─────────────────────────────────────────────────────

describe("duplicate-dynamics checker", () => {
	it("同パートで f → f が連続 → info 1件", () => {
		const ir = cleanIR([
			{
				kind: K.DYNAMIC,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "f",
				textRaw: "f",
			},
		]);
		const issues = duplicateDynamicsChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("info");
		expect(issues[0].partName).toBe("Vn1");
		expect(issues[0].detail?.previousMeasure).toBe(1);
	});

	it("subtype 同一で textNorm が異なっても重複扱い", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					subtype: 7,
					textNorm: "f",
					textRaw: "f",
				},
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 480,
					measure: 2,
					subtype: 7,
					textNorm: "",
					textRaw: "",
				},
			],
		});
		expect(duplicateDynamicsChecker.run(ir)).toHaveLength(1);
	});

	it("f → p のように変化 → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.DYNAMIC,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "p",
				textRaw: "p",
			},
		]);
		expect(duplicateDynamicsChecker.run(ir)).toHaveLength(0);
	});

	it("別パート間では重複判定しない", () => {
		// cleanIR は staff 0 と staff 1 にそれぞれ "f" を持つが別パートなので 0 件
		expect(duplicateDynamicsChecker.run(cleanIR())).toHaveLength(0);
	});
});

// ─── final-barline ──────────────────────────────────────────────────────────

describe("final-barline checker", () => {
	it("最終 barline が終止線でない → info 1件", () => {
		const ir = cleanIR([
			{
				kind: K.BAR_LINE,
				staff: 0,
				tick: 1920,
				measure: 4,
				barlineKind: BK.OTHER,
			},
		]);
		const issues = finalBarlineChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("info");
		expect(issues[0].measure).toBe(4);
	});

	it("最終 barline が FINAL → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.BAR_LINE,
				staff: 0,
				tick: 1920,
				measure: 4,
				barlineKind: BK.FINAL,
			},
		]);
		expect(finalBarlineChecker.run(ir)).toHaveLength(0);
	});

	it("複縦線がある途中 barline は無視し、最後の barline のみ判定", () => {
		const ir = cleanIR([
			{
				kind: K.BAR_LINE,
				staff: 0,
				tick: 480,
				measure: 2,
				barlineKind: BK.DOUBLE,
			},
			{
				kind: K.BAR_LINE,
				staff: 0,
				tick: 1920,
				measure: 4,
				barlineKind: BK.FINAL,
			},
		]);
		expect(finalBarlineChecker.run(ir)).toHaveLength(0);
	});

	it("barline が一つもない → 0件（誤検出を抑制）", () => {
		expect(finalBarlineChecker.run(cleanIR())).toHaveLength(0);
	});

	it("最終 barline が UNKNOWN（MuseScore 4 が barLineType を返さない場合）→ 0件", () => {
		const ir = cleanIR([
			{
				kind: K.BAR_LINE,
				staff: 0,
				tick: 1920,
				measure: 4,
				barlineKind: BK.UNKNOWN,
			},
		]);
		expect(finalBarlineChecker.run(ir)).toHaveLength(0);
	});
});

// ─── enabledRules ───────────────────────────────────────────────────────────

describe("enabledRules", () => {
	it("off にした checker は実行されない", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 }],
		});
		const issues = run(ir, {
			"opening-tempo": false,
			"first-note-dynamics": false,
		});
		expect(issues.filter((i) => i.ruleId === "opening-tempo")).toHaveLength(0);
		expect(
			issues.filter((i) => i.ruleId === "first-note-dynamics"),
		).toHaveLength(0);
	});
});
