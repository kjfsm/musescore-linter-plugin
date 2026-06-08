/**
 * セマンティックバージョンの比較ユーティリティ。
 *
 * QML 側はネットワーク I/O（GitHub API から tag_name を取得）だけを担い、
 * バージョン判定ロジックはここに集約して vitest でテスト可能にする。
 */

/** "v2.1.6" や " 2.1.6 " のような表記から数値コンポーネントを取り出す。 */
function parseVersion(v: string): number[] {
	if (typeof v !== "string") return [];
	const cleaned = v.trim().replace(/^v/i, "");
	if (cleaned.length === 0) return [];
	// "2.1.6-beta.1" のようなプレリリース表記は "-" / "+" 以降を無視する
	const core = cleaned.split(/[-+]/)[0];
	return core.split(".").map((part) => {
		const n = Number.parseInt(part, 10);
		return Number.isNaN(n) ? 0 : n;
	});
}

/**
 * 2 つのバージョンを比較する。
 * a < b なら -1、a === b なら 0、a > b なら 1 を返す。
 * 不正・空入力は 0 系（小さい側）として扱い、例外は投げない。
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
	const pa = parseVersion(a);
	const pb = parseVersion(b);
	const len = Math.max(pa.length, pb.length);
	for (let i = 0; i < len; i++) {
		const na = pa[i] ?? 0;
		const nb = pb[i] ?? 0;
		if (na < nb) return -1;
		if (na > nb) return 1;
	}
	return 0;
}

/**
 * latest が current より新しいかどうか。
 * どちらかが解釈不能（空文字・非数値のみ）なら更新を促さない（false）。
 */
export function isNewerVersion(current: string, latest: string): boolean {
	if (parseVersion(latest).length === 0) return false;
	if (parseVersion(current).length === 0) return false;
	return compareVersions(current, latest) < 0;
}
