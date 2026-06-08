import { registerAll } from "@musescore-linter/checkers";
import {
	buildSnapshot,
	compareVersions,
	getCheckerList,
	isNewerVersion,
	runAllCheckers,
} from "@musescore-linter/core";

// バンドルロード時に全チェッカーを登録
registerAll();

export {
	buildSnapshot,
	compareVersions,
	getCheckerList,
	isNewerVersion,
	runAllCheckers,
};
