import { readFileSync } from "node:fs";
import { join } from "node:path";

import { builtinRules, createLinter } from "@score-linter/linter";
import { readMusicXmlBytes } from "@score-linter/reader-musicxml";
import { describe, test } from "vitest";

const SCORES = join(import.meta.dirname, "..", "..", "..", "fixtures", "scores");
const FILES = {
  cut: join(SCORES, "Beethoven_Op.67_1_cut", "symphony-no-5.mxl"),
  full: join(SCORES, "Beethoven_Op.67_1_full", "Beethoven_Op.67_1_full.mxl"),
};

const everyRule = Object.fromEntries(builtinRules.map((r) => [r.id, true]));
const linter = createLinter(builtinRules);

for (const [name, file] of Object.entries(FILES)) {
  const bytes = readFileSync(file);

  describe(name, () => {
    test("MusicXML の読み込み", async ({ bench }) => {
      await bench("MusicXML の読み込み", () => {
        readMusicXmlBytes(bytes);
      }).run();
    });

    test("全ルールの実行", async ({ bench }) => {
      // 問い合わせの結果は Score ごとに覚えられるので、毎回読み直した Score に対して計る
      let score = readMusicXmlBytes(bytes).score;
      await bench(
        "全ルールの実行",
        {
          beforeEach: () => {
            score = readMusicXmlBytes(bytes).score;
          },
        },
        () => {
          linter.lint(score, { enabled: everyRule });
        },
      ).run();
    });
  });
}
