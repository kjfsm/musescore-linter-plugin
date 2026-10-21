import type { Score } from "@score-linter/score-model";

import { decodeXml, extractMxl, isZip } from "./mxl.ts";
import { readMusicXml } from "./reader.ts";

export { readMusicXml };

/**
 * 非圧縮（.musicxml / .xml）と圧縮（.mxl）のどちらでも受け取る。中身の先頭バイトで
 * 判別するので拡張子には依存しない。`xml` は楽譜のプレビューのように、元の MusicXML を
 * そのまま使いたい呼び出し元のために返す。
 */
export function readMusicXmlBytes(bytes: Uint8Array): { score: Score; xml: string } {
  const xml = isZip(bytes) ? extractMxl(bytes) : decodeXml(bytes);
  return { score: readMusicXml(xml), xml };
}
