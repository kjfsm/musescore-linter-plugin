import type { Score } from "@score-linter/score-model";

/**
 * Score の JSON を少しずつ作る。プラグインのスナップショットのタブで使う。
 *
 * QML のエンジンの JSON.stringify は大きな楽譜で数秒かかる。一度に作ると UI が固まり、
 * タブを離れても止められないので、ホストがタイマーで step を呼んで分けて進める。
 * 配列の要素（音符・注記など）は 1 行に 1 つ。読み戻すと Score と同じ値になる。
 */
export interface SnapshotWriter {
  readonly total: number;
  readonly done: number;
  /** 最大 `max` 個の要素を書く。書き終えたら true。 */
  step(max: number): boolean;
  text(): string;
}

type Piece = () => string;

const INDENT = "  ";

function inline(value: unknown): string {
  return JSON.stringify(value);
}

/** `items` を 1 行 1 要素の配列として書く断片の列。 */
function arrayPieces(items: readonly unknown[], indent: string): Piece[] {
  if (items.length === 0) return [() => "[]"];
  const pieces: Piece[] = [() => "["];
  items.forEach((item, i) => {
    const comma = i < items.length - 1 ? "," : "";
    pieces.push(() => `\n${indent}${INDENT}${inline(item)}${comma}`);
  });
  pieces.push(() => `\n${indent}]`);
  return pieces;
}

function stavesPieces(score: Score): Piece[] {
  const pad = INDENT.repeat(2);
  const pieces: Piece[] = [() => "["];
  score.staves.forEach((staff, i) => {
    pieces.push(
      () =>
        `\n${pad}{ "index": ${staff.index}, "partId": ${inline(staff.partId)}, "barlines": ${inline(staff.barlines)}, "keySignatures": ${inline(staff.keySignatures)}, "voices": [`,
    );
    staff.voices.forEach((voice, v) => {
      pieces.push(() => `\n${pad}${INDENT}{ "events": `);
      pieces.push(...arrayPieces(voice.events, pad + INDENT));
      pieces.push(() => ` }${v < staff.voices.length - 1 ? "," : ""}`);
    });
    pieces.push(
      () =>
        `${staff.voices.length > 0 ? `\n${pad}` : ""}] }${i < score.staves.length - 1 ? "," : ""}`,
    );
  });
  pieces.push(() => `\n${INDENT}]`);
  return pieces;
}

export function createSnapshotWriter(score: Score): SnapshotWriter {
  const pieces: Piece[] = [() => "{"];
  const field = (key: keyof Score, body: Piece[], last = false) => {
    pieces.push(() => `\n${INDENT}${inline(key)}: `);
    pieces.push(...body);
    if (!last) pieces.push(() => ",");
  };
  field("parts", [() => inline(score.parts)]);
  field("measures", arrayPieces(score.measures, INDENT));
  field("partGroups", [() => inline(score.partGroups)]);
  field("annotations", arrayPieces(score.annotations, INDENT));
  field("slurs", arrayPieces(score.slurs, INDENT));
  field("ties", arrayPieces(score.ties, INDENT));
  field("hairpins", arrayPieces(score.hairpins, INDENT));
  field("staves", stavesPieces(score), true);
  pieces.push(() => "\n}\n");

  const out: string[] = [];
  let done = 0;
  return {
    total: pieces.length,
    get done() {
      return done;
    },
    step(max) {
      const end = Math.min(pieces.length, done + max);
      for (; done < end; done++) out.push(pieces[done]!());
      return done >= pieces.length;
    },
    text() {
      return out.join("");
    },
  };
}
