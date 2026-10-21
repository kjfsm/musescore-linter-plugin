import { readFileSync } from "node:fs";
import { join } from "node:path";

import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { readMusicXmlBytes } from "../src/index.ts";
import { isZip } from "../src/mxl.ts";

const xml = readFileSync(join(__dirname, "fixtures", "duet.musicxml"));
const encoder = new TextEncoder();

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container><rootfiles><rootfile full-path="score.xml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>`;

describe("readMusicXmlBytes", () => {
  it("非圧縮の MusicXML をそのまま読む", () => {
    expect(isZip(xml)).toBe(false);
    expect(readMusicXmlBytes(xml).score.parts).toHaveLength(2);
  });

  it("BOM 付きでもルート要素を見失わない", () => {
    const withBom = encoder.encode(`﻿${xml.toString("utf8")}`);
    expect(readMusicXmlBytes(withBom).score.parts).toHaveLength(2);
  });

  it(".mxl は META-INF/container.xml の rootfile を辿って本体を取り出す", () => {
    const mxl = zipSync({
      "META-INF/container.xml": encoder.encode(CONTAINER),
      "score.xml": new Uint8Array(xml),
      // container.xml が指す先を優先すること（こちらを読むと壊れる）
      "decoy.xml": encoder.encode("<not-musicxml/>"),
    });
    expect(isZip(mxl)).toBe(true);
    const { score } = readMusicXmlBytes(mxl);
    expect(score.parts.map((p) => p.name)).toEqual(["Violin I", "Violin II"]);
    expect(score.staves[0]?.voices.flatMap((v) => v.events).length).toBeGreaterThan(0);
  });

  it("container.xml が無い .mxl は META-INF 以外の XML にフォールバックする", () => {
    const mxl = zipSync({ "whatever.musicxml": new Uint8Array(xml) });
    expect(readMusicXmlBytes(mxl).score.parts).toHaveLength(2);
  });

  it("XML を含まない .mxl は理由がわかるエラーになる", () => {
    const mxl = zipSync({ "readme.txt": encoder.encode("hello") });
    expect(() => readMusicXmlBytes(mxl)).toThrow(/MusicXML 本体が見つかりません/);
  });

  it("非圧縮の MusicXML から楽譜と元の XML 文字列の両方を返す", () => {
    const { score, xml: text } = readMusicXmlBytes(xml);
    expect(score.parts).toHaveLength(2);
    expect(text).toContain("score-partwise");
  });

  it(".mxl からも楽譜と展開済みの XML 文字列の両方を返す", () => {
    const mxl = zipSync({
      "META-INF/container.xml": encoder.encode(CONTAINER),
      "score.xml": new Uint8Array(xml),
    });
    const { score, xml: text } = readMusicXmlBytes(mxl);
    expect(score.parts).toHaveLength(2);
    expect(text).toContain("score-partwise");
  });
});
