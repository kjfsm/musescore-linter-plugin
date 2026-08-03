import type { LintIR } from "@musescore-linter/core";

import { buildIRFromMusicXML, TICKS_PER_QUARTER } from "./builder.js";
import { decodeXml, extractMxl, isZip } from "./mxl.js";

export { buildIRFromMusicXML, TICKS_PER_QUARTER };

/**
 * 非圧縮（.musicxml / .xml）と圧縮（.mxl）のどちらでも受け取れる入口。
 * 中身の先頭バイトで判別するので拡張子には依存しない。
 */
export function buildIRFromBytes(bytes: Uint8Array): LintIR {
  return buildIRFromBytesWithXml(bytes).ir;
}

/**
 * {@link buildIRFromBytes} と同じ入口だが、デコード済みの MusicXML 文字列も一緒に返す。
 * OSMD のような「元の MusicXML をそのまま渡したい」呼び出し元向け。
 */
export function buildIRFromBytesWithXml(bytes: Uint8Array): { ir: LintIR; xml: string } {
  const xml = isZip(bytes) ? extractMxl(bytes) : decodeXml(bytes);
  return { ir: buildIRFromMusicXML(xml), xml };
}
