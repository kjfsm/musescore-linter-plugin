import { register, reset } from "@musescore-linter/core";
import { articulationSlurConsistencyChecker } from "./articulationSlurConsistencyChecker.js";
import { codaSegnoChecker } from "./codaSegnoChecker.js";
import { conLegnoArcoChecker } from "./conLegnoArcoChecker.js";
import { courtesyAccidentalChecker } from "./courtesyAccidentalChecker.js";
import { divisiChecker } from "./divisiChecker.js";
import { duplicateDynamicsChecker } from "./duplicateDynamicsChecker.js";
import { finalBarlineChecker } from "./finalBarlineChecker.js";
import { firstNoteDynamicsChecker } from "./firstNoteDynamicsChecker.js";
import { hairpinTargetDynamicChecker } from "./hairpinTargetDynamicChecker.js";
import { harpTableChecker } from "./harpTableChecker.js";
import { muteOpenChecker } from "./muteOpenChecker.js";
import { openingTempoChecker } from "./openingTempoChecker.js";
import { pizzArcoChecker } from "./pizzArcoChecker.js";
import { rehearsalMarkOrderChecker } from "./rehearsalMarkOrderChecker.js";
import { repeatBarlineMatchChecker } from "./repeatBarlineMatchChecker.js";
import { restAnnotationChecker } from "./restAnnotationChecker.js";
import { simultaneousDynamicsChecker } from "./simultaneousDynamicsChecker.js";
import { soloTuttiChecker } from "./soloTuttiChecker.js";
import { sordinoChecker } from "./sordinoChecker.js";
import { sulPontOrdChecker } from "./sulPontOrdChecker.js";
import { sulTastoOrdChecker } from "./sulTastoOrdChecker.js";
import { tempoBarlineChecker } from "./tempoBarlineChecker.js";
import { tempoChangeResolutionChecker } from "./tempoChangeResolutionChecker.js";
import { tempoWithoutBpmChecker } from "./tempoWithoutBpmChecker.js";
import { tiePitchMismatchChecker } from "./tiePitchMismatchChecker.js";
import { unaCordaChecker } from "./unaCordaChecker.js";

export function registerAll(): void {
	reset();
	register(pizzArcoChecker);
	register(sordinoChecker);
	register(soloTuttiChecker);
	register(divisiChecker);
	register(sulTastoOrdChecker);
	register(sulPontOrdChecker);
	register(conLegnoArcoChecker);
	register(muteOpenChecker);
	register(unaCordaChecker);
	register(harpTableChecker);
	register(articulationSlurConsistencyChecker);
	register(restAnnotationChecker);
	register(tempoBarlineChecker);
	register(openingTempoChecker);
	register(firstNoteDynamicsChecker);
	register(tempoWithoutBpmChecker);
	register(tempoChangeResolutionChecker);
	register(duplicateDynamicsChecker);
	register(simultaneousDynamicsChecker);
	register(hairpinTargetDynamicChecker);
	register(finalBarlineChecker);
	register(codaSegnoChecker);
	register(rehearsalMarkOrderChecker);
	register(repeatBarlineMatchChecker);
	register(tiePitchMismatchChecker);
	register(courtesyAccidentalChecker);
}

export {
	articulationSlurConsistencyChecker,
	codaSegnoChecker,
	conLegnoArcoChecker,
	courtesyAccidentalChecker,
	divisiChecker,
	duplicateDynamicsChecker,
	finalBarlineChecker,
	firstNoteDynamicsChecker,
	hairpinTargetDynamicChecker,
	harpTableChecker,
	muteOpenChecker,
	openingTempoChecker,
	pizzArcoChecker,
	rehearsalMarkOrderChecker,
	repeatBarlineMatchChecker,
	restAnnotationChecker,
	simultaneousDynamicsChecker,
	soloTuttiChecker,
	sordinoChecker,
	sulPontOrdChecker,
	sulTastoOrdChecker,
	tempoBarlineChecker,
	tempoChangeResolutionChecker,
	tempoWithoutBpmChecker,
	tiePitchMismatchChecker,
	unaCordaChecker,
};
