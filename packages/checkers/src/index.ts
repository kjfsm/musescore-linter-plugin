import type { Checker } from "@musescore-linter/core";
import { register, reset } from "@musescore-linter/core";

import { beatCrossingTieChecker } from "./beatCrossingTieChecker.js";
import { codaSegnoChecker } from "./codaSegnoChecker.js";
import { conLegnoArcoChecker } from "./conLegnoArcoChecker.js";
import { courtesyAccidentalChecker } from "./courtesyAccidentalChecker.js";
import { crescTextResolutionChecker } from "./crescTextResolutionChecker.js";
import { divisiChecker } from "./divisiChecker.js";
import { duplicateDynamicsChecker } from "./duplicateDynamicsChecker.js";
import { finalBarlineChecker } from "./finalBarlineChecker.js";
import { firstNoteDynamicsChecker } from "./firstNoteDynamicsChecker.js";
import { hairpinOnRestChecker } from "./hairpinOnRestChecker.js";
import { hairpinTargetDynamicChecker } from "./hairpinTargetDynamicChecker.js";
import { harpTableChecker } from "./harpTableChecker.js";
import { muteOpenChecker } from "./muteOpenChecker.js";
import { openingTempoChecker } from "./openingTempoChecker.js";
import { pizzArcoChecker } from "./pizzArcoChecker.js";
import { rehearsalMarkOrderChecker } from "./rehearsalMarkOrderChecker.js";
import { repeatBarlineMatchChecker } from "./repeatBarlineMatchChecker.js";
import { restAnnotationChecker } from "./restAnnotationChecker.js";
import { simultaneousDynamicsChecker } from "./simultaneousDynamicsChecker.js";
import { slurOnRestChecker } from "./slurOnRestChecker.js";
import { slurSingleNoteChecker } from "./slurSingleNoteChecker.js";
import { slurTieArticulationConsistencyChecker } from "./slurTieArticulationConsistencyChecker.js";
import { soloTuttiChecker } from "./soloTuttiChecker.js";
import { sordinoChecker } from "./sordinoChecker.js";
import { sulPontOrdChecker } from "./sulPontOrdChecker.js";
import { sulTastoOrdChecker } from "./sulTastoOrdChecker.js";
import { tempoBarlineChecker } from "./tempoBarlineChecker.js";
import { tempoChangeResolutionChecker } from "./tempoChangeResolutionChecker.js";
import { tempoWithoutBpmChecker } from "./tempoWithoutBpmChecker.js";
import { tiePitchMismatchChecker } from "./tiePitchMismatchChecker.js";
import { unaCordaChecker } from "./unaCordaChecker.js";

/**
 * 登録される checker の一覧。**この配列が唯一の登録点**。
 *
 * 並び順はそのまま実行順・検出結果の並び順になる。関連しあうペア（pizz./arco など）を
 * 隣り合わせてあるので、追加するときは意味のある位置に入れること。
 *
 * 以前は import・registerAll 内の register 呼び出し・末尾の re-export ブロックの
 * 3 箇所を手で揃える必要があり、契約書には「唯一の同期点」と書いてあった。
 * 個別の re-export には利用者が 1 つも無かった（外から使われるのは registerAll だけで、
 * テストは ../src/xxxChecker.js を直接読む）ので落とし、import と この配列の 2 箇所にした。
 */
export const ALL_CHECKERS: Checker[] = [
  pizzArcoChecker,
  sordinoChecker,
  soloTuttiChecker,
  divisiChecker,
  sulTastoOrdChecker,
  sulPontOrdChecker,
  conLegnoArcoChecker,
  muteOpenChecker,
  unaCordaChecker,
  harpTableChecker,
  slurTieArticulationConsistencyChecker,
  restAnnotationChecker,
  tempoBarlineChecker,
  openingTempoChecker,
  firstNoteDynamicsChecker,
  tempoWithoutBpmChecker,
  tempoChangeResolutionChecker,
  duplicateDynamicsChecker,
  simultaneousDynamicsChecker,
  hairpinTargetDynamicChecker,
  finalBarlineChecker,
  codaSegnoChecker,
  rehearsalMarkOrderChecker,
  repeatBarlineMatchChecker,
  tiePitchMismatchChecker,
  courtesyAccidentalChecker,
  hairpinOnRestChecker,
  slurOnRestChecker,
  slurSingleNoteChecker,
  crescTextResolutionChecker,
  beatCrossingTieChecker,
];

export function registerAll(): void {
  reset();
  for (const checker of ALL_CHECKERS) register(checker);
}
