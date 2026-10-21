import type { Rule } from "../types.ts";
import { beatCrossingTie } from "./beatCrossingTie.ts";
import { codaSegno } from "./codaSegno.ts";
import { conLegnoArco } from "./conLegnoArco.ts";
import { courtesyAccidental } from "./courtesyAccidental.ts";
import { crescTextResolution } from "./crescTextResolution.ts";
import { divUnis } from "./divUnis.ts";
import { duplicateDynamics } from "./duplicateDynamics.ts";
import { duplicateSlur } from "./duplicateSlur.ts";
import { duplicateTempo } from "./duplicateTempo.ts";
import { dynamicAfterRest } from "./dynamicAfterRest.ts";
import { dynamicAsText } from "./dynamicAsText.ts";
import { enharmonicSpelling } from "./enharmonicSpelling.ts";
import { extremeSpelling } from "./extremeSpelling.ts";
import { fermataConsistency } from "./fermataConsistency.ts";
import { finalBarline } from "./finalBarline.ts";
import { firstNoteDynamics } from "./firstNoteDynamics.ts";
import { hairpinOnRest } from "./hairpinOnRest.ts";
import { hairpinTargetDynamic } from "./hairpinTargetDynamic.ts";
import { harpTable } from "./harpTable.ts";
import { keySignature } from "./keySignature.ts";
import { mergeableTie } from "./mergeableTie.ts";
import { muteOpen } from "./muteOpen.ts";
import { openingTempo } from "./openingTempo.ts";
import { overlappingHairpins } from "./overlappingHairpins.ts";
import { pizzArco } from "./pizzArco.ts";
import { redundantAccidental } from "./redundantAccidental.ts";
import { rehearsalMarkOrder } from "./rehearsalMarkOrder.ts";
import { rehearsalMarkPosition } from "./rehearsalMarkPosition.ts";
import { repeatBarlineMatch } from "./repeatBarlineMatch.ts";
import { restAnnotation } from "./restAnnotation.ts";
import { restGrouping } from "./restGrouping.ts";
import { simultaneousDynamics } from "./simultaneousDynamics.ts";
import { slurOnRest } from "./slurOnRest.ts";
import { slurSamePitch } from "./slurSamePitch.ts";
import { slurSingleNote } from "./slurSingleNote.ts";
import { slurTieArticulationConsistency } from "./slurTieArticulationConsistency.ts";
import { slurTieEndpoint } from "./slurTieEndpoint.ts";
import { soloTutti } from "./soloTutti.ts";
import { sordino } from "./sordino.ts";
import { sulPontOrd } from "./sulPontOrd.ts";
import { sulTastoOrd } from "./sulTastoOrd.ts";
import { tempoBarline } from "./tempoBarline.ts";
import { tempoChangeResolution } from "./tempoChangeResolution.ts";
import { tempoWithoutBpm } from "./tempoWithoutBpm.ts";
import { tieContinuationDynamic } from "./tieContinuationDynamic.ts";
import { tiePitchMismatch } from "./tiePitchMismatch.ts";
import { unaCorda } from "./unaCorda.ts";

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
