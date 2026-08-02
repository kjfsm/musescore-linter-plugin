import type { FileResult } from "@musescore-linter/cli";
import { countBySeverity, stripPartPrefix } from "@musescore-linter/cli";
import type { Issue, Severity } from "@musescore-linter/core";

export interface Row {
	key: string;
	measure: number;
	severity: Severity;
	partName: string;
	message: string;
	ruleId: string;
}

/**
 * checker のメッセージは QML の一行表示向けに `"<パート名>: ..."` で始まるものが多い。
 * 表ではパート名を独立した列に出すので、重複する接頭辞を落とす（CLI の pretty 出力と同じ）。
 */
export function toRows(issues: Issue[]): Row[] {
	return issues.map((issue, i) => ({
		// ruleId + 位置だけでは同一小節の同種 issue が衝突するので index を混ぜる
		key: `${issue.ruleId}:${issue.staffIdx}:${issue.tick}:${i}`,
		measure: issue.measure,
		severity: issue.severity,
		partName: issue.partName,
		message: stripPartPrefix(issue),
		ruleId: issue.ruleId,
	}));
}

export function summarize(results: FileResult[]): Record<Severity, number> {
	return countBySeverity(results.flatMap((r) => r.issues));
}
