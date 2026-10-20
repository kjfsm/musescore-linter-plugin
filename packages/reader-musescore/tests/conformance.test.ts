import { readFileSync } from "node:fs";
import { join } from "node:path";

import { connect } from "@score-linter/musescore-plugin-helpers";
import { readMusicXml } from "@score-linter/reader-musicxml";
import type { Score } from "@score-linter/score-model";
import { describe, expect, it } from "vitest";

import { readMuseScore } from "../src/reader.js";
import { duetScore, host } from "./fixtures/duetMock.js";

// 実際の MuseScore のどの版とも違う値。ホストの enum 経由で解決されることを確かめる。
const duetXml = readFileSync(
  join(__dirname, "../../reader-musicxml/tests/fixtures/duet.musicxml"),
  "utf8",
);

const scopeStaff = (a: Score["annotations"][number]): number =>
  a.scope.type === "staff" ? a.scope.staff : -1;

/**
 * 比べる前にそろえる差は 2 つだけ。パートの id（MuseScore は並び順、MusicXML は元の id）と、
 * 注釈の並び（MuseScore はセグメントごと、MusicXML はパートごとに読む）。
 */
function normalized(score: Score): Score {
  const ids = new Map(score.parts.map((p, i) => [p.id, `part-${i}`]));
  const idOf = (id: string) => ids.get(id) ?? id;
  return {
    ...score,
    parts: score.parts.map((p) => ({ ...p, id: idOf(p.id) })),
    staves: score.staves.map((s) => ({ ...s, partId: idOf(s.partId) })),
    annotations: score.annotations
      .map((a, i) => ({ a, i }))
      .sort((x, y) => x.a.tick - y.a.tick || scopeStaff(x.a) - scopeStaff(y.a) || x.i - y.i)
      .map(({ a }) => a),
  };
}

describe("MuseScore と MusicXML の読み込み口の継ぎ目", () => {
  it("同じ楽譜（duet）から同じ Score が作られる", () => {
    const fromMuseScore = readMuseScore(connect(host), duetScore()).score;
    const fromMusicXml = readMusicXml(duetXml);
    expect(normalized(fromMuseScore)).toEqual(normalized(fromMusicXml));
  });
});
