import { describe, expect, it } from "vitest";

import { interpretAnnotation } from "../src/interpret.js";

describe("interpretAnnotation", () => {
  it("奏法の表記揺れを 1 つの Directive に寄せる", () => {
    for (const text of ["pizz.", "Pizz", "pizzicato", "  PIZZ.  "]) {
      expect(interpretAnnotation(text).directives, text).toEqual([
        { type: "technique", technique: "pizz" },
      ]);
    }
    expect(interpretAnnotation("con  sordino").directives).toEqual([
      { type: "technique", technique: "con-sord" },
    ]);
  });

  it("強弱記号を記号と修飾語に分ける", () => {
    expect(interpretAnnotation("f espr.", { kind: "dynamic" }).directives).toEqual([
      { type: "dynamic", mark: "f", modifier: "espr." },
    ]);
    expect(interpretAnnotation("più f", { kind: "dynamic" }).directives).toEqual([
      { type: "dynamic", mark: "f", modifier: "più" },
    ]);
    expect(interpretAnnotation("sfz", { kind: "dynamic" }).directives).toEqual([
      { type: "dynamic", mark: "sfz", modifier: "" },
    ]);
  });

  it("自由テキストの f は強弱記号として扱わない", () => {
    expect(interpretAnnotation("f").kind).toBe("text");
    expect(interpretAnnotation("f").directives).toEqual([]);
  });

  it("ソースが構造として持つ強弱記号をテキストより優先する", () => {
    expect(
      interpretAnnotation("fespr.", { kind: "dynamic", dynamic: { mark: "f", modifier: "espr." } })
        .directives,
    ).toEqual([{ type: "dynamic", mark: "f", modifier: "espr." }]);
  });

  it("テンポ語で始まる自由テキストをテンポ表記にする", () => {
    expect(interpretAnnotation("Allegro con brio")).toEqual({
      kind: "tempo",
      directives: [{ type: "tempo", bpm: null, word: "allegro" }],
    });
  });

  it("ソースの BPM をテンポに載せ、正でない値は捨てる", () => {
    expect(interpretAnnotation("♩ = 120", { kind: "tempo", bpm: 120 }).directives).toEqual([
      { type: "tempo", bpm: 120, word: null },
    ]);
    for (const bpm of [0, -1, Number.NaN, null]) {
      expect(interpretAnnotation("Adagio", { kind: "tempo", bpm }).directives).toEqual([
        { type: "tempo", bpm: null, word: "adagio" },
      ]);
    }
  });

  it("漸次的なテンポ変化と解除を読み分ける", () => {
    expect(interpretAnnotation("poco rit.").directives).toEqual([
      { type: "tempo-change", change: "gradual" },
    ]);
    expect(interpretAnnotation("a tempo").directives).toEqual([
      { type: "tempo-change", change: "reset" },
    ]);
  });

  it("cresc. と dim. を強弱の変化として読む", () => {
    expect(interpretAnnotation("cresc.").directives).toEqual([
      { type: "dynamic-change", direction: "crescendo" },
    ]);
    expect(interpretAnnotation("decresc").directives).toEqual([
      { type: "dynamic-change", direction: "diminuendo" },
    ]);
  });

  it("反復記号を読み、参照と行き先を分ける", () => {
    const marks = (text: string) =>
      interpretAnnotation(text).directives.flatMap((d) => (d.type === "repeat" ? [d.mark] : []));
    expect(marks("D.S. al Coda")).toEqual(["dal-segno", "al-coda"]);
    expect(marks("D.C. al Fine")).toEqual(["da-capo", "al-fine"]);
    expect(marks("Segno")).toEqual(["segno"]);
    expect(marks("Coda")).toEqual(["coda"]);
    expect(marks("Fine")).toEqual(["fine"]);
    expect(marks("To Coda")).toEqual(["to-coda"]);
  });

  it("リハーサルマークは元のラベルを持つ", () => {
    expect(interpretAnnotation(" A ", { kind: "rehearsal" }).directives).toEqual([
      { type: "rehearsal", label: "A" },
    ]);
  });
});
