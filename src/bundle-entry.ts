import { registerAll } from "@musescore-linter/checkers";
import {
  compareVersions,
  getCheckerList,
  isNewerVersion,
  runAllCheckers,
} from "@musescore-linter/core";
import { buildSnapshot } from "@musescore-linter/source-musescore";

// バンドルロード時に全チェッカーを登録
registerAll();

export { buildSnapshot, compareVersions, getCheckerList, isNewerVersion, runAllCheckers };
