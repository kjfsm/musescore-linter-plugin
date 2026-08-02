import { XMLParser } from "fast-xml-parser";

/**
 * MusicXML は `<measure>` 直下の `<note>` / `<backup>` / `<forward>` / `<direction>` の
 * **出現順そのものに意味がある**（tick カーソルの進退を決める）。fast-xml-parser の通常
 * モードはタグ名でグルーピングしてしまい順序が失われるので `preserveOrder: true` を使う。
 *
 * preserveOrder の表現:
 *   `<note x="1"><rest/></note>` → `{ note: [ { rest: [] } ], ":@": { "@_x": "1" } }`
 *   テキストノード                → `{ "#text": "value" }`
 */
export type XNode = Record<string, unknown>;

const ATTRS = ":@";
const TEXT = "#text";

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	preserveOrder: true,
	parseTagValue: false,
	parseAttributeValue: false,
	trimValues: true,
	// MusicXML には <p>/<f> など HTML と紛らわしいタグがあるため、エンティティ以外の
	// 変換はすべて無効にして生の文字列として扱う。
	processEntities: true,
});

export function parseXml(text: string): XNode[] {
	return parser.parse(text) as XNode[];
}

/** ノードのタグ名（`:@` 以外の唯一のキー）。テキストノードなら `#text`。 */
export function tagOf(node: XNode): string {
	for (const key of Object.keys(node)) {
		if (key !== ATTRS) return key;
	}
	return "";
}

export function childrenOf(node: XNode): XNode[] {
	const value = node[tagOf(node)];
	return Array.isArray(value) ? (value as XNode[]) : [];
}

export function attrsOf(node: XNode): Record<string, string> {
	const raw = node[ATTRS];
	if (!raw || typeof raw !== "object") return {};
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		out[k.startsWith("@_") ? k.slice(2) : k] = String(v);
	}
	return out;
}

export function attr(node: XNode, name: string): string | undefined {
	return attrsOf(node)[name];
}

export function findAll(nodes: XNode[], tag: string): XNode[] {
	return nodes.filter((n) => tagOf(n) === tag);
}

export function find(nodes: XNode[], tag: string): XNode | undefined {
	return nodes.find((n) => tagOf(n) === tag);
}

export function childrenNamed(node: XNode, tag: string): XNode[] {
	return findAll(childrenOf(node), tag);
}

export function child(node: XNode, tag: string): XNode | undefined {
	return find(childrenOf(node), tag);
}

/** 子孫のテキストノードを連結して返す（`<words>` の中に書式タグが混ざる場合に備える）。 */
export function textOf(node: XNode | undefined): string {
	if (!node) return "";
	const parts: string[] = [];
	const walk = (n: XNode): void => {
		const tag = tagOf(n);
		if (tag === TEXT) {
			parts.push(String(n[TEXT] ?? ""));
			return;
		}
		for (const c of childrenOf(n)) walk(c);
	};
	walk(node);
	return parts.join("").trim();
}

/** 子要素 `tag` のテキスト。存在しなければ undefined。 */
export function childText(node: XNode, tag: string): string | undefined {
	const c = child(node, tag);
	return c ? textOf(c) : undefined;
}

export function childNumber(node: XNode, tag: string): number | undefined {
	const t = childText(node, tag);
	if (t === undefined || t === "") return undefined;
	const n = Number(t);
	return Number.isFinite(n) ? n : undefined;
}

export function hasChild(node: XNode, tag: string): boolean {
	return child(node, tag) !== undefined;
}
