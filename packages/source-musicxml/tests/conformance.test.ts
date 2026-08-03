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

  // ─── ここから下は MuseScore 経路との既知の差分（M2 で埋める） ───

  // builder.ts の staffIdx 解決が必ず staffOffset 以上を返すため、
  // scope: "global" のイベントを 1 つも作らない。opening-tempo /
  // first-note-dynamics / cresc-text-resolution / hairpin-target-dynamic の
  // global フォールバック分岐が MusicXML 経路では死んでいる。
  it("【既知の差分】global scope のイベントを作らない", () => {
    expect(profile.hasGlobalScope).toBe(false);
  });

  // MusicXML には MuseScore の subtype に相当する情報が無いため埋めていない。
  // duplicate-dynamics / simultaneous-dynamics が textNorm 比較に劣化する。
  it("【既知の差分】テキスト系イベントの subtype が埋まっていない", () => {
    expect(profile.subtypeFilledRatio).toBe(0);
  });

  // EXPRESSION と SYSTEM_TEXT を生成しない（すべて STAFF_TEXT に落ちる）。
  // rest-annotation / tempo-change-resolution / coda-segno が空振りする。
  it("【既知の差分】EXPRESSION / SYSTEM_TEXT を生成しない", () => {
    expect(profile.kinds).not.toContain("expression");
    expect(profile.kinds).not.toContain("system_text");
  });
});
