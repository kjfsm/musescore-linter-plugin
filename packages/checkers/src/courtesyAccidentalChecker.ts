import type { Checker, IndexedIR, Issue } from "@musescore-linter/core";
import {
  CANONICAL,
  createIssue,
  eventsOnStaff,
  tpcToAlter,
  tpcToName,
} from "@musescore-linter/core";

// 親切（cautionary / courtesy）臨時記号の提案。
// 慣習: 前の小節で臨時記号が付いた音が、次の小節で（小節線で記号が打ち消されたあと）
// 記号なしで再び現れる場合、ほぼすべての出版社は念のための臨時記号を補う。
// ここでは「直前の小節で明示された臨時記号」と「次の小節・同一譜表位置・記号なし・響き変化」を
// 突き合わせて提案する（severity は info: あくまで提案）。
function alterName(alter: number): string {
  switch (alter) {
    case 0:
      return "ナチュラル";
    case 1:
      return "シャープ";
    case -1:
      return "フラット";
    case 2:
      return "ダブルシャープ";
    case -2:
      return "ダブルフラット";
    default:
      return "臨時記号";
  }
}

export const courtesyAccidentalChecker: Checker = {
  id: "courtesy-accidental",
  name: "親切臨時記号の提案",
  description: "親切臨時記号を付けた方がよい箇所を提案",
  category: "notation",
  severity: "info",
  defaultEnabled: true,
  run(ir: IndexedIR): Issue[] {
    const issues: Issue[] = [];

    for (const part of ir.meta.parts) {
      const chords = eventsOnStaff(ir, part.staffIdx, CANONICAL.elementKinds.CHORD);
      if (chords.length === 0) continue;

      chords.sort((a, b) => a.measure - b.measure || a.tick - b.tick || a.voice - b.voice);

      // 譜表位置(line) → 最後に臨時記号が明示された { measure, alter }
      const lastExplicit = new Map<number, { measure: number; alter: number }>();
      // 同一 (line, measure) への重複提案を抑止
      const suggested = new Set<string>();

      for (const ch of chords) {
        for (const note of ch.notes ?? []) {
          const alter = tpcToAlter(note.tpc);

          if (note.accidentalShown) {
            lastExplicit.set(note.line, { measure: ch.measure, alter });
            continue;
          }

          const prev = lastExplicit.get(note.line);
          if (!prev) continue;
          if (prev.measure !== ch.measure - 1) continue; // 直前の小節のみ
          if (prev.alter === alter) continue; // 響きが変わっていない

          const key = `${note.line}:${ch.measure}`;
          if (suggested.has(key)) continue;
          suggested.add(key);

          issues.push(
            createIssue(courtesyAccidentalChecker, {
              message: `${part.partName}: ${tpcToName(note.tpc)} に親切のための${alterName(alter)}を補うとよいかもしれません（${ch.measure}小節目、前の小節で${alterName(prev.alter)}が付いていた音）`,
              partName: part.partName,
              staffIdx: part.staffIdx,
              measure: ch.measure,
              tick: ch.tick,
              detail: {
                line: note.line,
                previousMeasure: prev.measure,
                previousAlter: prev.alter,
                currentAlter: alter,
              },
            }),
          );
        }
      }
    }
    return issues;
  },
};
