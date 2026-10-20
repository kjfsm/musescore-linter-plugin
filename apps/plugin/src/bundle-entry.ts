import { registerAll } from "@score-linter/checkers";
import {
  compareVersions,
  getCategories,
  getCheckerList,
  getCheckerPerfReport,
  isCheckerEnabled,
  isNewerVersion,
  resolveCheckerOptions,
  runAllCheckers,
  setPerfEnabled,
} from "@score-linter/core";
import { buildSnapshot, getSnapshotPerfReport } from "@score-linter/source-musescore";

// バンドルロード時に全チェッカーを登録
registerAll();

export {
  buildSnapshot,
  compareVersions,
  getCategories,
  getCheckerList,
  getCheckerPerfReport,
  getSnapshotPerfReport,
  isCheckerEnabled,
  isNewerVersion,
  resolveCheckerOptions,
  runAllCheckers,
  setPerfEnabled,
};
