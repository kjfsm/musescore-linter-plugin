import { readFileSync } from "node:fs";
import { join } from "node:path";

import { profileIR } from "@musescore-linter/core";
import { describe, expect, it } from "vitest";

import { buildIRFromMusicXML } from "../src/builder.js";

const duet = readFileSync(join(__dirname, "fixtures", "duet.musicxml"), "utf8");

/**
 * MusicXML 経路が作る LintIR の契約プロファイル。MuseScore 経路側の同名テスト
 * （packages/source-musescore/tests/conformance.test.ts）と並べて読むと、
 * 両ソースの差がそのまま見える。
 *
 * false / 0 になっている項目が「MuseScore 経路にはあるが MusicXML 経路には無い」もので、
 * checker が入力ソースによって動いたり動かなかったりする原因になる。埋めるたびに
 * ここの期待値を true / 正の値へ書き換えていく。
 */
describe("MusicXML 経路の LintIR 契約プロファイル", () => {
  const profile = profileIR(buildIRFromMusicXML(duet));

  it("索引は events と整合している", () => {
    expect(profile.indexConsistent).toBe(true);
  });

  it("type は kind から導出した値と一致する", () => {
    expect(profile.typeMatchesKind).toBe(true);
  });

  it("meta.measures を持つ", () => {
    expect(profile.hasMeasures).toBe(true);
  });

  it("小節番号を解決できないイベントは無い", () => {
    expect(profile.eventsWithoutMeasure).toBe(0);
  });

  // ─── ここから下は MuseScore 経路との表現の違い ───
  //
  // いずれも MusicXML 側に相当する表現が無いことによるもので、埋めようとすると
  // テキストからの推測になる（＝誤検出の温床）。代わりに checker 側を
  // 「どちらの表現でも同じ結果になる」形にしてある:
  //   - kind の違い → base/predicates.ts の kind 集合（STAFF_TEXT を必ず含む）
  //   - scope の違い → base/query.ts の eventIdsForStaff（譜表 + global を常に併合）
  //   - subtype の欠落 → checker は subtype が無ければ textNorm にフォールバックする
  // ここが false / 0 のままでも checker の挙動は MuseScore 経路と揃う。

  it("global scope のイベントを作らない（譜表に載せる）", () => {
    expect(profile.hasGlobalScope).toBe(false);
  });

  it("テキスト系イベントの subtype を埋めない", () => {
    expect(profile.subtypeFilledRatio).toBe(0);
  });

  it("EXPRESSION / SYSTEM_TEXT を作らず staff_text に落とす", () => {
    expect(profile.kinds).not.toContain("expression");
    expect(profile.kinds).not.toContain("system_text");
    expect(profile.kinds).toContain("staff_text");
  });
});
