import type { LintIR } from "@musescore-linter/core";
import { buildIRFromMusicXML, TICKS_PER_QUARTER } from "./builder.js";
import { decodeXml, extractMxl, isZip } from "./mxl.js";

export { buildIRFromMusicXML, TICKS_PER_QUARTER };

/**
 * 非圧縮（.musicxml / .xml）と圧縮（.mxl）のどちらでも受け取れる入口。
 * 中身の先頭バイトで判別するので拡張子には依存しない。
 */
export function buildIRFromBytes(bytes: Uint8Array): LintIR {
	const xml = isZip(bytes) ? extractMxl(bytes) : decodeXml(bytes);
	return buildIRFromMusicXML(xml);
}
