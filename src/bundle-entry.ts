import { registerAll } from "@musescore-linter/checkers";
import {
	buildSnapshot,
	getCheckerList,
	runAllCheckers,
} from "@musescore-linter/core";

// バンドルロード時に全チェッカーを登録
registerAll();

export { buildSnapshot, getCheckerList, runAllCheckers };
