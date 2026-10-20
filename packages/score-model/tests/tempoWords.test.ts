import { describe, expect, it } from "vitest";

import { leadingTempoWord } from "../src/tempoWords.js";

describe("leadingTempoWord", () => {
  it("テンポ語だけのテキストを認識する", () => {
    for (const text of ["Allegro", "andante", "PRESTO", "Adagio", "Vivace", "Grave"]) {
      expect(leadingTempoWord(text), text).not.toBeNull();
    }
  });

  it("テンポ語で始まり後ろに修飾が続くテキストを認識する", () => {
    for (const text of [
      "Allegro con brio",
      "Andante con moto",
      "Allegro ma non troppo",
      "Adagio sostenuto",
    ]) {
      expect(leadingTempoWord(text), text).not.toBeNull();
    }
  });

  it("修飾語が先行してもテンポ語に届けば認識する", () => {
    for (const text of ["Molto allegro", "Un poco adagio", "Piu mosso", "Non troppo allegro"]) {
      expect(leadingTempoWord(text), text).not.toBeNull();
    }
  });

  it("ドイツ語・フランス語のテンポ語も認識する", () => {
    for (const text of ["Langsam", "Sehr lebhaft", "Vite", "Assez animé"]) {
      expect(leadingTempoWord(text), text).not.toBeNull();
    }
  });

  it("漸次的テンポ変化と a tempo は認識しない", () => {
    for (const text of ["rit.", "ritardando", "accel.", "rallentando", "a tempo", "Tempo primo"]) {
      expect(leadingTempoWord(text), text).toBeNull();
    }
  });

  it("表情記号や奏法指示は認識しない", () => {
    for (const text of ["dolce", "espressivo", "pizz.", "con sordino", "cantabile", ""]) {
      expect(leadingTempoWord(text), text).toBeNull();
    }
  });

  // 先頭からしか見ないので、文中にたまたま含まれるだけのものは拾わない。
  it("テンポ語が先頭に無ければ認識しない", () => {
    expect(leadingTempoWord("come sopra allegro")).toBeNull();
    expect(leadingTempoWord("in tempo di allegro")).toBeNull();
  });

  it("修飾語が続きすぎる場合は打ち切る", () => {
    expect(leadingTempoWord("molto poco un e allegro")).toBeNull();
  });
});
