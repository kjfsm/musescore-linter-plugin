import { ensureDerived, reset, runAllCheckers } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";
import { codaSegnoChecker } from "../src/codaSegnoChecker.js";
import { conLegnoArcoChecker } from "../src/conLegnoArcoChecker.js";
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
import { sulPontOrdChecker } from "../src/sulPontOrdChecker.js";
import { sulTastoOrdChecker } from "../src/sulTastoOrdChecker.js";
import { tempoBarlineChecker } from "../src/tempoBarlineChecker.js";
import { tempoWithoutBpmChecker } from "../src/tempoWithoutBpmChecker.js";
import { BK, buildIR, cleanIR, K, quintetIR } from "./helpers/irBuilder.js";

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

	it("pizz. なしで arco のみ → 0件（on 状態未経験の off 指示は不問）", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
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

	it("同パートで f → f が連続していてもヘアピンがあれば 0件", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 960,
					measure: 3,
					textNorm: "f",
					textRaw: "f",
				},
			],
			hairpins: [{ staffIdx: 0, startTick: 240, endTick: 720 }],
		});
		expect(duplicateDynamicsChecker.run(ir)).toHaveLength(0);
	});

	it("ヘアピンが別パートにある場合は重複判定する", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }, { partName: "Vn2" }],
			events: [
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 960,
					measure: 3,
					textNorm: "f",
					textRaw: "f",
				},
			],
			hairpins: [{ staffIdx: 1, startTick: 240, endTick: 720 }],
		});
		const issues = duplicateDynamicsChecker.run(ir);
		expect(issues).toHaveLength(1);
	});

	it("ヘアピンが2番目のダイナミクス以降に始まる場合は重複判定する", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 480,
					measure: 2,
					textNorm: "f",
					textRaw: "f",
				},
			],
			hairpins: [{ staffIdx: 0, startTick: 480, endTick: 960 }],
		});
		const issues = duplicateDynamicsChecker.run(ir);
		expect(issues).toHaveLength(1);
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
});

// ─── sul-tasto-ord ──────────────────────────────────────────────────────────

describe("sul-tasto-ord checker", () => {
	it("sul tasto のまま曲が終わる → warning 1件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "sul tasto",
				textRaw: "sul tasto",
			},
		]);
		const issues = sulTastoOrdChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("warning");
	});

	it("sul tasto → ord. で解除 → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "sul tasto",
				textRaw: "sul tasto",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "ord.",
				textRaw: "ord.",
			},
		]);
		expect(sulTastoOrdChecker.run(ir)).toHaveLength(0);
	});

	it("sul tasto → arco で解除 → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "sul tasto",
				textRaw: "sul tasto",
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
		expect(sulTastoOrdChecker.run(ir)).toHaveLength(0);
	});

	it("sul tasto なしで arco のみ → 0件（on 状態未経験の off 指示は不問）", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "arco",
				textRaw: "arco",
			},
		]);
		expect(sulTastoOrdChecker.run(ir)).toHaveLength(0);
	});

	it("sul tasto なしで ord. のみ → 0件（on 状態未経験の off 指示は不問）", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "ord.",
				textRaw: "ord.",
			},
		]);
		expect(sulTastoOrdChecker.run(ir)).toHaveLength(0);
	});
});

// ─── sul-pont-ord ────────────────────────────────────────────────────────────

describe("sul-pont-ord checker", () => {
	it("sul pont. のまま曲が終わる → warning 1件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "sul pont.",
				textRaw: "sul pont.",
			},
		]);
		const issues = sulPontOrdChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("warning");
	});

	it("sul ponticello → ord. で解除 → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "sul ponticello",
				textRaw: "sul ponticello",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "ord.",
				textRaw: "ord.",
			},
		]);
		expect(sulPontOrdChecker.run(ir)).toHaveLength(0);
	});
});

// ─── con-legno-arco ──────────────────────────────────────────────────────────

describe("con-legno-arco checker", () => {
	it("con legno のまま曲が終わる → warning 1件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "con legno",
				textRaw: "con legno",
			},
		]);
		const issues = conLegnoArcoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("warning");
	});

	it("col legno → arco で解除 → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "col legno",
				textRaw: "col legno",
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
		expect(conLegnoArcoChecker.run(ir)).toHaveLength(0);
	});

	it("con legno 連続指示 → warning 1件（前回小節が記録される）", () => {
		const ir = cleanIR([
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 480,
				measure: 2,
				textNorm: "con legno",
				textRaw: "con legno",
			},
			{
				kind: K.STAFF_TEXT,
				staff: 0,
				tick: 960,
				measure: 3,
				textNorm: "con legno",
				textRaw: "con legno",
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
		const issues = conLegnoArcoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].detail?.previousMeasure).toBe(2);
	});
});

// ─── rest-annotation（追加ケース）──────────────────────────────────────────

describe("rest-annotation checker（追加ケース）", () => {
	it("休符に pizz. (STAFF_TEXT) → error 1件", () => {
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
					kind: K.STAFF_TEXT,
					staff: 0,
					tick: 480,
					measure: 2,
					textNorm: "pizz.",
					textRaw: "pizz.",
				},
			],
		});
		const issues = restAnnotationChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("error");
	});

	it("音符の位置に pizz. (STAFF_TEXT) → 0件（休符のみ対象）", () => {
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
				{
					kind: K.STAFF_TEXT,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "pizz.",
					textRaw: "pizz.",
				},
			],
		});
		expect(restAnnotationChecker.run(ir)).toHaveLength(0);
	});

	it("複数スタッフで複数の違反 → 各スタッフ分を検出", () => {
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
				{ kind: K.REST, staff: 0, tick: 0, measure: 1 },
				{ kind: K.REST, staff: 1, tick: 0, measure: 1 },
				{
					kind: K.DYNAMIC,
					staff: 0,
					tick: 0,
					measure: 1,
					textNorm: "f",
					textRaw: "f",
				},
				{
					kind: K.DYNAMIC,
					staff: 1,
					tick: 0,
					measure: 1,
					textNorm: "p",
					textRaw: "p",
				},
			],
		});
		const issues = restAnnotationChecker.run(ir);
		expect(issues).toHaveLength(2);
		const partNames = issues.map((i) => i.partName).sort();
		expect(partNames).toEqual(["Vn1", "Vn2"]);
	});

	it("音符の位置にダイナミクス → 0件（休符のみ対象）", () => {
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
			],
		});
		expect(restAnnotationChecker.run(ir)).toHaveLength(0);
	});
});

// ─── tempo-barline（追加ケース）────────────────────────────────────────────

describe("tempo-barline checker（追加ケース）", () => {
	it("同テンポ値への変更はスキップされる（テンポ同一なら info を出さない）", () => {
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
					tempo: 2.0,
					textNorm: "allegro",
					textRaw: "Allegro",
				},
				{ kind: K.CHORD, staff: 0, tick: 960, measure: 3 },
			],
		});
		expect(tempoBarlineChecker.run(ir)).toHaveLength(0);
	});

	it("テンポ変更が2回あり両方複縦線なし → info 2件", () => {
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
				{ kind: K.CHORD, staff: 0, tick: 1440, measure: 4 },
				{
					kind: K.TEMPO_TEXT,
					staff: 0,
					tick: 1920,
					measure: 5,
					tempo: 1.5,
					textNorm: "andante",
					textRaw: "Andante",
				},
				{ kind: K.CHORD, staff: 0, tick: 1920, measure: 5 },
			],
		});
		const issues = tempoBarlineChecker.run(ir);
		expect(issues).toHaveLength(2);
	});
});

// ─── coda-segno ──────────────────────────────────────────────────────────────

describe("coda-segno checker", () => {
	it("D.S. があるが Segno なし → error 1件", () => {
		const ir = cleanIR([
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 960,
				measure: 3,
				textNorm: "d.s.",
				textRaw: "D.S.",
			},
		]);
		const issues = codaSegnoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].severity).toBe("error");
	});

	it("D.S. al Coda があるが Segno も Coda もなし → error 2件", () => {
		const ir = cleanIR([
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 960,
				measure: 3,
				textNorm: "d.s. al coda",
				textRaw: "D.S. al Coda",
			},
		]);
		const issues = codaSegnoChecker.run(ir);
		expect(issues).toHaveLength(2);
	});

	it("Coda があるが al Coda 参照なし → error 1件", () => {
		const ir = cleanIR([
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 960,
				measure: 3,
				textNorm: "coda",
				textRaw: "Coda",
			},
		]);
		const issues = codaSegnoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toContain("al Coda");
	});

	it("D.S. al Coda + Segno + Coda すべて揃っている → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 0,
				measure: 1,
				textNorm: "segno",
				textRaw: "Segno",
			},
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 960,
				measure: 3,
				textNorm: "d.s. al coda",
				textRaw: "D.S. al Coda",
			},
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 1440,
				measure: 4,
				textNorm: "coda",
				textRaw: "Coda",
			},
		]);
		expect(codaSegnoChecker.run(ir)).toHaveLength(0);
	});

	it("何もない → 0件", () => {
		expect(codaSegnoChecker.run(cleanIR())).toHaveLength(0);
	});

	it("D.C. al Fine があるが Fine マークなし → error 1件", () => {
		const ir = cleanIR([
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 960,
				measure: 3,
				textNorm: "d.c. al fine",
				textRaw: "D.C. al Fine",
			},
		]);
		const issues = codaSegnoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toContain("Fine");
	});

	it("D.S. al Fine があるが Fine マークなし → error 1件", () => {
		const ir = cleanIR([
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 0,
				measure: 1,
				textNorm: "segno",
				textRaw: "Segno",
			},
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 960,
				measure: 3,
				textNorm: "d.s. al fine",
				textRaw: "D.S. al Fine",
			},
		]);
		const issues = codaSegnoChecker.run(ir);
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toContain("Fine");
	});

	it("D.C. al Fine + Fine マークあり → 0件", () => {
		const ir = cleanIR([
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 480,
				measure: 2,
				textNorm: "fine",
				textRaw: "Fine",
			},
			{
				kind: K.SYSTEM_TEXT,
				staffIdx: -1,
				scope: "global",
				tick: 960,
				measure: 3,
				textNorm: "d.c. al fine",
				textRaw: "D.C. al Fine",
			},
		]);
		expect(codaSegnoChecker.run(ir)).toHaveLength(0);
	});
});

// ─── irBuilder（quintetIR ヘルパー）────────────────────────────────────────

describe("irBuilder quintetIR ヘルパー", () => {
	it("quintetIR は Vn1/Vn2/Va/Vc/Cb の 5 スタッフを持つ", () => {
		const ir = quintetIR();
		expect(ir.meta.parts).toHaveLength(5);
		expect(ir.meta.parts.map((p) => p.partName)).toEqual([
			"Vn1",
			"Vn2",
			"Va",
			"Vc",
			"Cb",
		]);
	});

	it("quintetIR は全チェッカーをパスする", () => {
		const ir = quintetIR();
		ensureDerived(ir);
		const issues = run(ir);
		expect(issues).toHaveLength(0);
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

	it("複数ルールを off にしても他のチェッカーは動く", () => {
		const ir = buildIR({
			parts: [{ partName: "Vn1" }],
			events: [
				{ kind: K.CHORD, staff: 0, tick: 0, measure: 1 },
				{
					kind: K.STAFF_TEXT,
					staff: 0,
					tick: 480,
					measure: 2,
					textNorm: "pizz.",
					textRaw: "pizz.",
				},
			],
		});
		const issues = run(ir, {
			"opening-tempo": false,
			"first-note-dynamics": false,
		});
		expect(issues.filter((i) => i.ruleId === "pizz-arco")).toHaveLength(1);
	});
});
