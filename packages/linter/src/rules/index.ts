import type { Rule } from "../types.js";
import { slurTieArticulationConsistency } from "./articulationConsistency.js";
import { beatCrossingTie } from "./beatCrossingTie.js";
import {
  crescTextResolution,
  duplicateDynamics,
  firstNoteDynamics,
  hairpinOnRest,
  hairpinTargetDynamic,
  simultaneousDynamics,
} from "./dynamics.js";
import {
  codaSegno,
  courtesyAccidental,
  finalBarline,
  rehearsalMarkOrder,
  repeatBarlineMatch,
  restAnnotation,
} from "./notation.js";
import { slurOnRest, slurSingleNote, tiePitchMismatch } from "./slurTie.js";
import {
  conLegnoArco,
  divUnis,
  harpTable,
  muteOpen,
  pizzArco,
  sordino,
  soloTutti,
  sulPontOrd,
  sulTastoOrd,
  unaCorda,
} from "./techniquePairs.js";
import { openingTempo, tempoBarline, tempoChangeResolution, tempoWithoutBpm } from "./tempo.js";

/**
 * 組み込みのルール。並びがそのまま実行順で、設定画面の並びにもなる。
 * 関連するペア（pizz./arco など）を隣り合わせてあるので、足すときは意味のある位置に入れる。
 */
export const builtinRules: readonly Rule[] = [
  pizzArco,
  sordino,
  soloTutti,
  divUnis,
  sulTastoOrd,
  sulPontOrd,
  conLegnoArco,
  muteOpen,
  unaCorda,
  harpTable,
  slurTieArticulationConsistency,
  restAnnotation,
  tempoBarline,
  openingTempo,
  firstNoteDynamics,
  tempoWithoutBpm,
  tempoChangeResolution,
  duplicateDynamics,
  simultaneousDynamics,
  hairpinTargetDynamic,
  finalBarline,
  codaSegno,
  rehearsalMarkOrder,
  repeatBarlineMatch,
  tiePitchMismatch,
  courtesyAccidental,
  hairpinOnRest,
  slurOnRest,
  slurSingleNote,
  crescTextResolution,
  beatCrossingTie,
];
