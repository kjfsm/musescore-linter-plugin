import { describe, expect, it } from "vitest";

import { looksLikeTempoText } from "../src/tempoWords.js";

describe("looksLikeTempoText", () => {
  it("テンポ語だけのテキストを認識する", () => {
    for (const text of ["Allegro", "andante", "PRESTO", "Adagio", "Vivace", "Grave"]) {
      expect(looksLikeTempoText(text), text).toBe(true);
    }
  });

  it("テンポ語で始まり後ろに修飾が続くテキストを認識する", () => {
    for (const text of [
      "Allegro con brio",
      "Andante con moto",
      "Allegro ma non troppo",
      "Adagio sostenuto",
    ]) {
      expect(looksLikeTempoText(text), text).toBe(true);
    }
  });

  it("修飾語が先行してもテンポ語に届けば認識する", () => {
    for (const text of ["Molto allegro", "Un poco adagio", "Piu mosso", "Non troppo allegro"]) {
      expect(looksLikeTempoText(text), text).toBe(true);
    }
  });

  it("ドイツ語・フランス語のテンポ語も認識する", () => {
    for (const text of ["Langsam", "Sehr lebhaft", "Vite", "Assez animé"]) {
      expect(looksLikeTempoText(text), text).toBe(true);
    }
  });

  // 漸次的変化と「a tempo」は tempo-change-resolution が staff_text のまま扱って
  // おり、TEMPO_TEXT に昇格させると tempo-without-bpm が全件に反応してしまう。
  it("漸次的テンポ変化と a tempo は認識しない", () => {
    for (const text of ["rit.", "ritardando", "accel.", "rallentando", "a tempo", "Tempo primo"]) {
      expect(looksLikeTempoText(text), text).toBe(false);
    }
  });

  it("表情記号や奏法指示は認識しない", () => {
    for (const text of ["dolce", "espressivo", "pizz.", "con sordino", "cantabile", ""]) {
      expect(looksLikeTempoText(text), text).toBe(false);
    }
  });

  // 先頭からしか見ないので、文中にたまたま含まれるだけのものは拾わない。
  it("テンポ語が先頭に無ければ認識しない", () => {
    expect(looksLikeTempoText("come sopra allegro")).toBe(false);
    expect(looksLikeTempoText("in tempo di allegro")).toBe(false);
  });

  it("修飾語が続きすぎる場合は打ち切る", () => {
    expect(looksLikeTempoText("molto poco un e allegro")).toBe(false);
  });
});
