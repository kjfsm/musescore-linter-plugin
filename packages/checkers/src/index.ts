import { register, reset } from "@musescore-linter/core";
import { codaSegnoChecker } from "./codaSegnoChecker.js";
import { conLegnoArcoChecker } from "./conLegnoArcoChecker.js";
import { divisiChecker } from "./divisiChecker.js";
import { duplicateDynamicsChecker } from "./duplicateDynamicsChecker.js";
import { finalBarlineChecker } from "./finalBarlineChecker.js";
import { firstNoteDynamicsChecker } from "./firstNoteDynamicsChecker.js";
import { openingTempoChecker } from "./openingTempoChecker.js";
import { pizzArcoChecker } from "./pizzArcoChecker.js";
import { restAnnotationChecker } from "./restAnnotationChecker.js";
import { soloTuttiChecker } from "./soloTuttiChecker.js";
import { sordinoChecker } from "./sordinoChecker.js";
import { sulPontOrdChecker } from "./sulPontOrdChecker.js";
import { sulTastoOrdChecker } from "./sulTastoOrdChecker.js";
import { tempoBarlineChecker } from "./tempoBarlineChecker.js";
import { tempoWithoutBpmChecker } from "./tempoWithoutBpmChecker.js";

export function registerAll(): void {
	reset();
	register(pizzArcoChecker);
	register(sordinoChecker);
	register(soloTuttiChecker);
	register(divisiChecker);
	register(sulTastoOrdChecker);
	register(sulPontOrdChecker);
	register(conLegnoArcoChecker);
	register(restAnnotationChecker);
	register(tempoBarlineChecker);
	register(openingTempoChecker);
	register(firstNoteDynamicsChecker);
	register(tempoWithoutBpmChecker);
	register(duplicateDynamicsChecker);
	register(finalBarlineChecker);
	register(codaSegnoChecker);
}

export {
	codaSegnoChecker,
	conLegnoArcoChecker,
	divisiChecker,
	duplicateDynamicsChecker,
	finalBarlineChecker,
	firstNoteDynamicsChecker,
	openingTempoChecker,
	pizzArcoChecker,
	restAnnotationChecker,
	soloTuttiChecker,
	sordinoChecker,
	sulPontOrdChecker,
	sulTastoOrdChecker,
	tempoBarlineChecker,
	tempoWithoutBpmChecker,
};
