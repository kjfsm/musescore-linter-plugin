import { register, reset } from "@musescore-linter/core";
import { divisiChecker } from "./divisiChecker.js";
import { duplicateDynamicsChecker } from "./duplicateDynamicsChecker.js";
import { finalBarlineChecker } from "./finalBarlineChecker.js";
import { firstNoteDynamicsChecker } from "./firstNoteDynamicsChecker.js";
import { openingTempoChecker } from "./openingTempoChecker.js";
import { pizzArcoChecker } from "./pizzArcoChecker.js";
import { restAnnotationChecker } from "./restAnnotationChecker.js";
import { soloTuttiChecker } from "./soloTuttiChecker.js";
import { sordinoChecker } from "./sordinoChecker.js";
import { tempoBarlineChecker } from "./tempoBarlineChecker.js";
import { tempoWithoutBpmChecker } from "./tempoWithoutBpmChecker.js";

let registeredOnce = false;

export function registerAll(): void {
	if (registeredOnce) return;
	reset();
	register(pizzArcoChecker);
	register(sordinoChecker);
	register(soloTuttiChecker);
	register(divisiChecker);
	register(restAnnotationChecker);
	register(tempoBarlineChecker);
	register(openingTempoChecker);
	register(firstNoteDynamicsChecker);
	register(tempoWithoutBpmChecker);
	register(duplicateDynamicsChecker);
	register(finalBarlineChecker);
	registeredOnce = true;
}

export {
	divisiChecker,
	duplicateDynamicsChecker,
	finalBarlineChecker,
	firstNoteDynamicsChecker,
	openingTempoChecker,
	pizzArcoChecker,
	restAnnotationChecker,
	soloTuttiChecker,
	sordinoChecker,
	tempoBarlineChecker,
	tempoWithoutBpmChecker,
};
