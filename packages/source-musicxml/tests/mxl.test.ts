import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CANONICAL } from "@musescore-linter/core";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { buildIRFromBytes } from "../src/index.js";
import { isZip } from "../src/mxl.js";

const xml = readFileSync(join(__dirname, "fixtures", "duet.musicxml"));
const encoder = new TextEncoder();

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container><rootfiles><rootfile full-path="score.xml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>`;

describe("buildIRFromBytes", () => {
  it("非圧縮の MusicXML をそのまま読む", () => {
    expect(isZip(xml)).toBe(false);
    const ir = buildIRFromBytes(xml);
    expect(ir.meta.parts).toHaveLength(2);
  });

  it("BOM 付きでもルート要素を見失わない", () => {
    const withBom = encoder.encode(`﻿${xml.toString("utf8")}`);
    expect(buildIRFromBytes(withBom).meta.parts).toHaveLength(2);
  });

  it(".mxl は META-INF/container.xml の rootfile を辿って本体を取り出す", () => {
    const mxl = zipSync({
      "META-INF/container.xml": encoder.encode(CONTAINER),
      "score.xml": new Uint8Array(xml),
      // container.xml が指す先を優先すること（こちらを読むと壊れる）
      "decoy.xml": encoder.encode("<not-musicxml/>"),
    });
    expect(isZip(mxl)).toBe(true);
    const ir = buildIRFromBytes(mxl);
    expect(ir.meta.parts.map((p) => p.partName)).toEqual(["Violin I", "Violin II"]);
    expect(ir.index.byKind[CANONICAL.elementKinds.CHORD]?.length).toBeGreaterThan(0);
  });

  it("container.xml が無い .mxl は META-INF 以外の XML にフォールバックする", () => {
    const mxl = zipSync({ "whatever.musicxml": new Uint8Array(xml) });
    expect(buildIRFromBytes(mxl).meta.parts).toHaveLength(2);
  });

  it("XML を含まない .mxl は理由がわかるエラーになる", () => {
    const mxl = zipSync({ "readme.txt": encoder.encode("hello") });
    expect(() => buildIRFromBytes(mxl)).toThrow(/MusicXML 本体が見つかりません/);
  });
});
