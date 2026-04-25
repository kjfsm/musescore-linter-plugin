import { describe, expect, it } from "vitest";
import { compareIssues, createIssue } from "../src/issue.js";
import type { Checker, Issue } from "../src/types.js";

const mockChecker: Checker = {
	id: "test-checker",
	name: "Test",
	description: "",
	category: "test",
	severity: "warning",
	defaultEnabled: true,
	run: () => [],
};

describe("createIssue", () => {
	it("checker のデフォルト severity を使う", () => {
		const issue = createIssue(mockChecker, { message: "test" });
		expect(issue.severity).toBe("warning");
	});

	it("fields.severity で上書きできる", () => {
		const issue = createIssue(mockChecker, {
			severity: "error",
			message: "test",
		});
		expect(issue.severity).toBe("error");
	});

	it("必須フィールドが埋まる", () => {
		const issue = createIssue(mockChecker, {
			message: "msg",
			partName: "Vn1",
			staffIdx: 0,
			measure: 3,
			tick: 960,
		});
		expect(issue.ruleId).toBe("test-checker");
		expect(issue.category).toBe("test");
		expect(issue.message).toBe("msg");
		expect(issue.partName).toBe("Vn1");
		expect(issue.staffIdx).toBe(0);
		expect(issue.measure).toBe(3);
		expect(issue.tick).toBe(960);
		expect(issue.detail).toBeNull();
	});
});

describe("compareIssues", () => {
	it("measure → staffIdx → severity → tick の順でソートされる", () => {
		const issues: Issue[] = [
			{
				ruleId: "a",
				severity: "info",
				category: "",
				message: "",
				partName: "",
				staffIdx: 0,
				measure: 2,
				tick: 0,
				detail: null,
			},
			{
				ruleId: "b",
				severity: "error",
				category: "",
				message: "",
				partName: "",
				staffIdx: 1,
				measure: 1,
				tick: 500,
				detail: null,
			},
			{
				ruleId: "c",
				severity: "warning",
				category: "",
				message: "",
				partName: "",
				staffIdx: 0,
				measure: 1,
				tick: 0,
				detail: null,
			},
			{
				ruleId: "d",
				severity: "error",
				category: "",
				message: "",
				partName: "",
				staffIdx: 0,
				measure: 1,
				tick: 0,
				detail: null,
			},
		];
		const sorted = issues.slice().sort(compareIssues);
		expect(sorted.map((i) => i.ruleId).join(",")).toBe("d,c,b,a");
	});
});
