import type { MuseScore, Score } from "@kjfsm/musescore-plugin-sdk-types";
import { describe, expect, it } from "vitest";
import { buildSnapshot } from "../src/snapshot.js";
import type { HostEnums } from "../src/types.js";

// 実際の MuseScore v4.7.3 の値と一致しない、独自の割り当てを使う。焼き込んだ値ではなく
// hostEnums 経由で解決されることを証明するため。
const NoteType = {
	NORMAL: 100,
	ACCIACCATURA: 101,
	APPOGGIATURA: 102,
	GRACE4: 104,
	GRACE16: 108,
	GRACE32: 116,
	GRACE8_AFTER: 132,
	GRACE16_AFTER: 164,
	GRACE32_AFTER: 228,
	INVALID: 355,
};

const BarLineType = {
	NORMAL: 200,
	BROKEN: 201,
	DOTTED: 202,
	END: 206,
	DOUBLE: 204,
	START_REPEAT: 207,
	END_REPEAT: 208,
	END_START_REPEAT: 209,
	HEAVY: 213,
	DOUBLE_HEAVY: 214,
	REVERSE_END: 210,
};

function hostEnums(): HostEnums {
	return {
		noteType: NoteType as unknown as HostEnums["noteType"],
		barLineType: BarLineType as unknown as HostEnums["barLineType"],
	};
}

function mockHost(major: number, minor: number): MuseScore {
	return {
		mscoreMajorVersion: major,
		mscoreMinorVersion: minor,
	} as unknown as MuseScore;
}

// 1 小節・1 コード（NORMAL）・末尾に BarLine(END) を持つ最小限のスコア。
// isGraceNote / classifyBarlineKind の両方の経路を実際に通す。
function mockScoreWithContent(): Score {
	const chord = {
		name: "Chord",
		noteType: NoteType.NORMAL,
		duration: { numerator: 1, denominator: 4 },
		notes: [],
		stemDirection: 0,
		beamMode: 0,
		spannerForward: [],
	};
	const barline = { name: "BarLine", barlineType: BarLineType.END };

	const seg = {
		tick: 0,
		annotations: [],
		nextInMeasure: null,
		elementAt(track: number) {
			if (track === 0) return chord;
			if (track === 3) return barline;
			return null;
		},
	};
	const measure = { firstSegment: seg, nextMeasure: null, irregular: false };
	return {
		nstaves: 1,
		ntracks: 4,
		parts: [],
		firstMeasure: measure,
		staves: [],
	} as unknown as Score;
}

function emptyScore(): Score {
	return {
		nstaves: 0,
		ntracks: 0,
		parts: [],
		firstMeasure: null,
		staves: [],
	} as unknown as Score;
}

describe("buildSnapshot", () => {
	it("host を渡さないときは meta.hostVersion を設定しない", () => {
		const ir = buildSnapshot(emptyScore(), hostEnums());
		expect(ir.meta.hostVersion).toBeUndefined();
	});

	it("実行版が型の生成元 MuseScore バージョンと一致するとき ok:true を記録する", () => {
		// generatedFrom.tag は v4.7.3（packages/types/src/generated/_meta.ts）
		const ir = buildSnapshot(emptyScore(), hostEnums(), mockHost(4, 7));
		expect(ir.meta.hostVersion).toEqual({
			ok: true,
			generatedTag: "v4.7.3",
			running: "4.7",
		});
	});

	it("実行版が食い違うとき ok:false + message を記録する", () => {
		const ir = buildSnapshot(emptyScore(), hostEnums(), mockHost(4, 6));
		expect(ir.meta.hostVersion?.ok).toBe(false);
		expect(ir.meta.hostVersion?.generatedTag).toBe("v4.7.3");
		expect(ir.meta.hostVersion?.running).toBe("4.6");
		expect(ir.meta.hostVersion?.message).toBeTruthy();
	});

	it("hostEnums が strictEnum で包まれても通常の判定が壊れない", () => {
		const ir = buildSnapshot(mockScoreWithContent(), hostEnums());
		const chordEvents = ir.events.filter((e) => e.type === "chord");
		const barlineEvents = ir.events.filter((e) => e.type === "barline");
		expect(chordEvents).toHaveLength(1);
		expect(barlineEvents).toHaveLength(1);
	});

	it("3 引数契約で events が正しく生成される（旧・3引数フラット契約とは異なる）", () => {
		const ir = buildSnapshot(
			mockScoreWithContent(),
			hostEnums(),
			mockHost(4, 7),
		);
		expect(ir.events.length).toBeGreaterThan(0);
		const barline = ir.events.find((e) => e.type === "barline");
		expect(barline?.barlineKind).toBe("final");
	});
});
