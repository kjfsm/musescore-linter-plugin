import { buildSnapshot, runAllCheckers, getCheckerList } from "@musescore-linter/core";
import { registerAll } from "@musescore-linter/checkers";

// バンドルロード時に全チェッカーを登録
registerAll();

export { buildSnapshot, runAllCheckers, getCheckerList };
