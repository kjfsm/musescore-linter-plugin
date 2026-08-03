import { registerAll } from "@musescore-linter/checkers";
import {
  compareVersions,
  getCheckerList,
  getCheckerPerfReport,
  isNewerVersion,
  resolveCheckerOptions,
  runAllCheckers,
  setPerfEnabled,
} from "@musescore-linter/core";
import { buildSnapshot, getSnapshotPerfReport } from "@musescore-linter/source-musescore";

// バンドルロード時に全チェッカーを登録
registerAll();

export {
  buildSnapshot,
  compareVersions,
  getCheckerList,
  getCheckerPerfReport,
  getSnapshotPerfReport,
  isNewerVersion,
  resolveCheckerOptions,
  runAllCheckers,
  setPerfEnabled,
};
