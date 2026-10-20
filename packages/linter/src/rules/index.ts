import type { Rule } from "../types.js";
import { slurTieArticulationConsistency } from "./articulationConsistency.js";
import { beatCrossingTie } from "./beatCrossingTie.js";
import {
  crescTextResolution,
  duplicateDynamics,
  dynamicAfterRest,
  dynamicAsText,
  firstNoteDynamics,
  hairpinOnRest,
  hairpinTargetDynamic,
  overlappingHairpins,
  simultaneousDynamics,
  tieContinuationDynamic,
} from "./dynamics.js";
import {
  codaSegno,
  courtesyAccidental,
  finalBarline,
  rehearsalMarkOrder,
  rehearsalMarkPosition,
  repeatBarlineMatch,
  restAnnotation,
} from "./notation.js";
import { mergeableTie, restGrouping } from "./rhythm.js";
import {
  duplicateSlur,
  slurOnRest,
  slurSamePitch,
  slurSingleNote,
  slurTieEndpoint,
  tiePitchMismatch,
} from "./slurTie.js";
import { enharmonicSpelling, redundantAccidental } from "./spelling.js";
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
import {
  duplicateTempo,
  openingTempo,
  tempoBarline,
  tempoChangeResolution,
  tempoWithoutBpm,
} from "./tempo.js";

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
  duplicateTempo,
  duplicateDynamics,
  simultaneousDynamics,
  dynamicAsText,
  dynamicAfterRest,
  hairpinTargetDynamic,
  overlappingHairpins,
  finalBarline,
  codaSegno,
  rehearsalMarkOrder,
  rehearsalMarkPosition,
  repeatBarlineMatch,
  tiePitchMismatch,
  slurSamePitch,
  courtesyAccidental,
  redundantAccidental,
  enharmonicSpelling,
  hairpinOnRest,
  slurOnRest,
  slurSingleNote,
  slurTieEndpoint,
  duplicateSlur,
  tieContinuationDynamic,
  crescTextResolution,
  beatCrossingTie,
  mergeableTie,
  restGrouping,
];
