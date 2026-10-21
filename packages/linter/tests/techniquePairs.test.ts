import { buildScore } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { conLegnoArco } from "../src/rules/conLegnoArco.ts";
import { divUnis } from "../src/rules/divUnis.ts";
import { harpTable } from "../src/rules/harpTable.ts";
import { muteOpen } from "../src/rules/muteOpen.ts";
import { pizzArco } from "../src/rules/pizzArco.ts";
import { soloTutti } from "../src/rules/soloTutti.ts";
import { sordino } from "../src/rules/sordino.ts";
import { sulPontOrd } from "../src/rules/sulPontOrd.ts";
import { sulTastoOrd } from "../src/rules/sulTastoOrd.ts";
import { unaCorda } from "../src/rules/unaCorda.ts";
import { cleanScore, runRule } from "./helpers.ts";

/** 1 小節 480 tick として、小節 n（1 始まり）の頭に置く。 */
const staffText = (measure: number, text: string, staff = 0) => ({
  staff,
  measure,
  tick: (measure - 1) * 480,
  text,
});

describe("pizz-arco", () => {
  it("pizz. のまま曲が終わると、最後の pizz. に警告する", () => {
    const issues = runRule(pizzArco, cleanScore({ annotations: [staffText(2, "pizz.")] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: "warning",
      at: { partId: "P1", staff: 0, measure: 2, tick: 480 },
    });
  });

  it("pizz. の連続指示は、2 回目の位置に警告し前回の小節を detail に持つ", () => {
    const issues = runRule(
      pizzArco,
      cleanScore({
        annotations: [staffText(2, "pizz."), staffText(3, "pizz."), staffText(4, "arco")],
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.at.measure).toBe(3);
    expect(issues[0]!.detail).toEqual({ previousMeasure: 2 });
    expect(issues[0]!.message).toContain("{{measure:previousMeasure}}");
  });

  it("pizz. → arco と対応していれば指摘しない", () => {
    const score = cleanScore({ annotations: [staffText(2, "pizz."), staffText(3, "arco")] });
    expect(runRule(pizzArco, score)).toEqual([]);
  });

  it("pizz. を経ない arco は不問", () => {
    expect(runRule(pizzArco, cleanScore({ annotations: [staffText(2, "arco")] }))).toEqual([]);
  });

  // 名前で突き合わせると、同じ楽器を 2 人置いた編成で片方の pizz. がもう片方の arco で解除されてしまう
  it("同名でも id の違うパートは on/off の状態を共有しない", () => {
    const score = buildScore({
      parts: [
        { id: "P1", name: "Horn in F" },
        { id: "P2", name: "Horn in F" },
      ],
      annotations: [staffText(1, "pizz.", 0), staffText(2, "arco", 1)],
    });
    const issues = runRule(pizzArco, score);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.at).toMatchObject({ partId: "P1", staff: 0 });
  });

  it("同じパートの複数の譜表は 1 つの on/off の状態を共有する", () => {
    const score = buildScore({
      parts: [{ id: "P1", name: "Harp", staffCount: 2 }],
      annotations: [staffText(1, "pizz.", 0), staffText(2, "arco", 1)],
    });
    expect(runRule(pizzArco, score)).toEqual([]);
  });
});

describe("sordino", () => {
  it("con sord. のまま曲が終わると警告する", () => {
    expect(runRule(sordino, cleanScore({ annotations: [staffText(2, "con sord.")] }))).toHaveLength(
      1,
    );
  });

  it("con sord. → senza sord. と解除されていれば指摘しない", () => {
    const score = cleanScore({
      annotations: [staffText(2, "con sord."), staffText(3, "senza sord.")],
    });
    expect(runRule(sordino, score)).toEqual([]);
  });
});

describe("solo-tutti", () => {
  it("solo のまま曲が終わると警告する", () => {
    const issues = runRule(soloTutti, cleanScore({ annotations: [staffText(2, "solo")] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("warning");
  });

  // tutti を挟まない二連ソロは実際の記譜でも起こるので、重複は警告でなく情報にとどめる
  it("solo の連続指示（二連ソロ）は info で、前回の小節を detail に持つ", () => {
    const issues = runRule(
      soloTutti,
      cleanScore({
        annotations: [staffText(2, "solo"), staffText(3, "solo"), staffText(4, "tutti")],
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("info");
    expect(issues[0]!.detail).toEqual({ previousMeasure: 2 });
  });

  it("solo → tutti と対応していれば指摘しない", () => {
    const score = cleanScore({ annotations: [staffText(2, "solo"), staffText(3, "tutti")] });
    expect(runRule(soloTutti, score)).toEqual([]);
  });
});

describe("div-unis", () => {
  it("div. のまま曲が終わると警告する", () => {
    expect(runRule(divUnis, cleanScore({ annotations: [staffText(2, "div.")] }))).toHaveLength(1);
  });

  it("div. の連続指示は、前回の小節を detail に持つ", () => {
    const issues = runRule(
      divUnis,
      cleanScore({
        annotations: [staffText(2, "div."), staffText(3, "div."), staffText(4, "unis.")],
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.detail).toEqual({ previousMeasure: 2 });
  });

  it("div. → unis. と対応していれば指摘しない", () => {
    const score = cleanScore({ annotations: [staffText(2, "div."), staffText(3, "unis.")] });
    expect(runRule(divUnis, score)).toEqual([]);
  });
});

describe("sul-tasto-ord", () => {
  it("sul tasto のまま曲が終わると警告する", () => {
    const issues = runRule(sulTastoOrd, cleanScore({ annotations: [staffText(2, "sul tasto")] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("warning");
  });

  it.each(["ord.", "arco"])("sul tasto → %s で解除されていれば指摘しない", (release) => {
    const score = cleanScore({ annotations: [staffText(2, "sul tasto"), staffText(3, release)] });
    expect(runRule(sulTastoOrd, score)).toEqual([]);
  });

  it.each(["arco", "ord."])("sul tasto を経ない %s は不問", (text) => {
    expect(runRule(sulTastoOrd, cleanScore({ annotations: [staffText(2, text)] }))).toEqual([]);
  });
});

describe("sul-pont-ord", () => {
  it("sul pont. のまま曲が終わると警告する", () => {
    const issues = runRule(sulPontOrd, cleanScore({ annotations: [staffText(2, "sul pont.")] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("warning");
  });

  it("sul ponticello → ord. と解除されていれば指摘しない", () => {
    const score = cleanScore({
      annotations: [staffText(2, "sul ponticello"), staffText(3, "ord.")],
    });
    expect(runRule(sulPontOrd, score)).toEqual([]);
  });
});

describe("con-legno-arco", () => {
  it("con legno のまま曲が終わると警告する", () => {
    const issues = runRule(conLegnoArco, cleanScore({ annotations: [staffText(2, "con legno")] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("warning");
  });

  it("col legno → arco と解除されていれば指摘しない", () => {
    const score = cleanScore({ annotations: [staffText(2, "col legno"), staffText(3, "arco")] });
    expect(runRule(conLegnoArco, score)).toEqual([]);
  });

  it("con legno の連続指示は、前回の小節を detail に持つ", () => {
    const issues = runRule(
      conLegnoArco,
      cleanScore({
        annotations: [staffText(2, "con legno"), staffText(3, "con legno"), staffText(4, "arco")],
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.detail).toEqual({ previousMeasure: 2 });
  });
});

describe("mute-open", () => {
  it("mute のまま曲が終わると警告する", () => {
    const issues = runRule(muteOpen, cleanScore({ annotations: [staffText(2, "straight mute")] }));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("warning");
  });

  it("mute → open と解除されていれば指摘しない", () => {
    const score = cleanScore({ annotations: [staffText(2, "mute"), staffText(3, "open")] });
    expect(runRule(muteOpen, score)).toEqual([]);
  });
});

describe("una-corda", () => {
  it("una corda のまま曲が終わると警告する", () => {
    expect(
      runRule(unaCorda, cleanScore({ annotations: [staffText(2, "una corda")] })),
    ).toHaveLength(1);
  });

  it("una corda → tre corde と解除されていれば指摘しない", () => {
    const score = cleanScore({
      annotations: [staffText(2, "una corda"), staffText(3, "tre corde")],
    });
    expect(runRule(unaCorda, score)).toEqual([]);
  });
});

describe("harp-table", () => {
  it("près de la table のまま曲が終わると警告する", () => {
    const score = cleanScore({ annotations: [staffText(2, "près de la table")] });
    expect(runRule(harpTable, score)).toHaveLength(1);
  });

  it("près de la table → ordinario と解除されていれば指摘しない", () => {
    const score = cleanScore({
      annotations: [staffText(2, "près de la table"), staffText(3, "ordinario")],
    });
    expect(runRule(harpTable, score)).toEqual([]);
  });
});
