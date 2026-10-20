import type { MuseScore } from "@kjfsm/musescore-plugin-sdk-types";
import { generatedFrom } from "@kjfsm/musescore-plugin-sdk-types";

/** バージョン不一致時の挙動。 */
export type VersionMismatchMode = "throw" | "warn" | "ignore";

export interface DefinePluginOptions {
  /** プラグイン本体。QML の `MuseScore { }` オブジェクト（ホスト）を受け取る。 */
  run: (host: MuseScore) => void;
  /**
   * 型のターゲット版（`_meta` の `generatedFrom.tag`）と実行版が major/minor で
   * 食い違うときの挙動。既定は `"warn"`（`host.log` に出す）。
   */
  onVersionMismatch?: VersionMismatchMode;
}

/**
 * プラグインのエントリを定義する。QML からは `Logic.run(mscore)` のように
 * `MuseScore { }` オブジェクト自身を渡す。
 *
 * 返り値はホストを受け取る関数で、実行時にまずバージョン照合を行い（既定は警告）、
 * その後 `run` を呼ぶ。ホスト経由で `host.curScore` / `host.Element` など API 全体に
 * 型付きでアクセスできる（値は実行時に解決、型は生成）。
 *
 * `onVersionMismatch: "throw"` を指定すると、バージョン不一致時に返り値の関数が例外を
 * 投げる（MuseScore 側の uncaught 例外の扱いは版依存なので、利用は明示的に選ぶこと）。
 *
 * @example
 * ```ts
 * export const run = definePlugin({
 *   run(host) {
 *     const score = host.curScore;
 *     if (!score) return;
 *     for (const note of iterateNotes(score)) {
 *       if (note.type === host.Element.NOTE) { ... }
 *     }
 *   },
 * });
 * ```
 */
export function definePlugin(opts: DefinePluginOptions): (host: MuseScore) => void {
  const mode = opts.onVersionMismatch ?? "warn";
  return (host: MuseScore): void => {
    if (mode !== "ignore") {
      const check = checkHostVersion(host);
      if (!check.ok) {
        if (mode === "throw") throw new Error(check.message);
        host.log(check.message);
      }
    }
    opts.run(host);
  };
}

interface ParsedVersion {
  major: number;
  minor: number;
}

function parseTag(tag: string): ParsedVersion | null {
  const m = /v?(\d+)\.(\d+)/.exec(tag);
  if (!m) return null;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return { major, minor };
}

/** {@link checkHostVersion} の結果。予測される失敗なので throw せず Result で返す。 */
export type HostVersionCheck =
  | { ok: true }
  | { ok: false; message: string; want: ParsedVersion; have: ParsedVersion };

/**
 * 型が生成された MuseScore バージョン（`generatedFrom.tag`）と、実行中の MuseScore の
 * major/minor を突き合わせる。一致（または tag を解析できない）なら `{ ok: true }`。
 *
 * 値の並び替え（同一 minor の patch 差）は実行時 enum が吸収するため対象外。ここで検出
 * したいのは「型に存在するメンバ・API が実行版に無い」ような major/minor の不一致。
 */
export function checkHostVersion(host: MuseScore): HostVersionCheck {
  const want = parseTag(generatedFrom.tag);
  const have = { major: host.mscoreMajorVersion, minor: host.mscoreMinorVersion };
  if (!want || (have.major === want.major && have.minor === want.minor)) {
    return { ok: true };
  }
  const message =
    `MuseScore のバージョン不一致: 型は ${want.major}.${want.minor} (${generatedFrom.tag}) 向けですが、` +
    `実行中は ${have.major}.${have.minor} です。API/enum メンバが一致しない可能性があります。`;
  return { ok: false, message, want, have };
}

/** バージョン不一致なら例外を投げる（{@link checkHostVersion} の throw 版）。 */
export function assertHostVersion(host: MuseScore): void {
  const check = checkHostVersion(host);
  if (!check.ok) throw new Error(check.message);
}

/**
 * enum オブジェクトを Proxy で包み、存在しないメンバへのアクセスを「静かな undefined」ではなく
 * 例外にする（任意・厳格モード）。実行中の MuseScore に無いメンバを参照した時点で落とせる。
 *
 * 注意: MuseScore 4 の JS エンジン（Qt6 の V4）が ES6 `Proxy` を持つことが前提。
 *
 * @example `const Element = strictEnum("Element", host.Element);`
 */
export function strictEnum<T extends object>(name: string, e: T): T {
  return new Proxy(e, {
    get(target, key) {
      if (typeof key === "string" && !(key in target)) {
        throw new Error(`${name}.${key} は実行中の MuseScore に存在しません`);
      }
      return Reflect.get(target, key);
    },
  });
}
