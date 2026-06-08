import { describe, expect, it } from "vitest";
import { compareVersions, isNewerVersion } from "../src/version.js";

describe("compareVersions", () => {
	it("小さい側で -1 を返す", () => {
		expect(compareVersions("2.1.6", "2.2.0")).toBe(-1);
	});

	it("大きい側で 1 を返す", () => {
		expect(compareVersions("2.2.0", "2.1.6")).toBe(1);
	});

	it("同一バージョンで 0 を返す", () => {
		expect(compareVersions("2.1.6", "2.1.6")).toBe(0);
	});

	it("数値として比較する（文字列比較ではない）", () => {
		expect(compareVersions("2.9.0", "2.10.0")).toBe(-1);
	});

	it("v プレフィックスを無視する", () => {
		expect(compareVersions("v2.1.6", "2.1.6")).toBe(0);
		expect(compareVersions("v2.1.6", "v2.2.0")).toBe(-1);
	});

	it("桁数が異なっても比較できる", () => {
		expect(compareVersions("2.1", "2.1.0")).toBe(0);
		expect(compareVersions("2.1", "2.1.1")).toBe(-1);
	});

	it("プレリリース表記のコア部分で比較する", () => {
		expect(compareVersions("2.1.6-beta.1", "2.1.6")).toBe(0);
	});
});

describe("isNewerVersion", () => {
	it("latest が新しければ true", () => {
		expect(isNewerVersion("2.1.6", "2.2.0")).toBe(true);
		expect(isNewerVersion("2.1.6", "v2.2.0")).toBe(true);
	});

	it("同一なら false", () => {
		expect(isNewerVersion("2.1.6", "2.1.6")).toBe(false);
	});

	it("latest が古ければ false", () => {
		expect(isNewerVersion("2.2.0", "2.1.6")).toBe(false);
	});

	it("不正・空入力では更新を促さない（false）", () => {
		expect(isNewerVersion("2.1.6", "")).toBe(false);
		expect(isNewerVersion("", "2.2.0")).toBe(false);
		expect(isNewerVersion("2.1.6", "latest")).toBe(false);
		// 型外の入力でも例外を投げない
		expect(isNewerVersion(undefined as unknown as string, "2.2.0")).toBe(false);
	});
});
