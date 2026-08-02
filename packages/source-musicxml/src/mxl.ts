import { unzipSync } from "fflate";

import { attr, child, childrenNamed, find, parseXml } from "./xml.js";

const decoder = new TextDecoder("utf-8");

export function decodeXml(bytes: Uint8Array): string {
	const text = decoder.decode(bytes);
	// UTF-8 BOM は fast-xml-parser がルート要素を見失う原因になるので取り除く
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 先頭 4 バイトが ZIP のローカルファイルヘッダ（PK\x03\x04）か。 */
export function isZip(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 4 &&
		bytes[0] === 0x50 &&
		bytes[1] === 0x4b &&
		bytes[2] === 0x03 &&
		bytes[3] === 0x04
	);
}

/**
 * 圧縮 MusicXML（.mxl）から本体の XML を取り出す。
 * 規約どおり `META-INF/container.xml` の rootfile を優先し、無ければ META-INF 以外の
 * 最初の XML エントリにフォールバックする。
 */
export function extractMxl(bytes: Uint8Array): string {
	const entries = unzipSync(bytes);

	const container = entries["META-INF/container.xml"];
	if (container) {
		const doc = parseXml(decodeXml(container));
		const root = find(doc, "container");
		const rootfiles = root ? child(root, "rootfiles") : undefined;
		for (const rf of rootfiles ? childrenNamed(rootfiles, "rootfile") : []) {
			const path = attr(rf, "full-path");
			if (path && entries[path]) return decodeXml(entries[path]);
		}
	}

	for (const [name, data] of Object.entries(entries)) {
		if (name.startsWith("META-INF/")) continue;
		if (/\.(musicxml|xml)$/i.test(name)) return decodeXml(data);
	}

	throw new Error(
		".mxl の中に MusicXML 本体が見つかりません（META-INF/container.xml も XML エントリもありません）",
	);
}
