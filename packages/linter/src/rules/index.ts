import type { Rule } from "../types.ts";
import { slurTieArticulationConsistency } from "./articulationConsistency.ts";
import { beatCrossingTie } from "./beatCrossingTie.ts";
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
} from "./dynamics.ts";
import {
  codaSegno,
  courtesyAccidental,
  fermataConsistency,
  finalBarline,
  rehearsalMarkOrder,
  rehearsalMarkPosition,
  repeatBarlineMatch,
  restAnnotation,
} from "./notation.ts";
import { mergeableTie, restGrouping } from "./rhythm.ts";
import {
  duplicateSlur,
  slurOnRest,
  slurSamePitch,
  slurSingleNote,
  slurTieEndpoint,
  tiePitchMismatch,
} from "./slurTie.ts";
import {
  enharmonicSpelling,
  extremeSpelling,
  keySignature,
  redundantAccidental,
} from "./spelling.ts";
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
} from "./techniquePairs.ts";
import {
  duplicateTempo,
  openingTempo,
  tempoBarline,
  tempoChangeResolution,
  tempoWithoutBpm,
} from "./tempo.ts";

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
  extremeSpelling,
  keySignature,
  fermataConsistency,
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
