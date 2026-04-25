import { register, reset } from "@musescore-linter/core";
import { divisiChecker } from "./divisiChecker.js";
import { firstNoteDynamicsChecker } from "./firstNoteDynamicsChecker.js";
import { openingTempoChecker } from "./openingTempoChecker.js";
import { pizzArcoChecker } from "./pizzArcoChecker.js";
import { restAnnotationChecker } from "./restAnnotationChecker.js";
import { soloTuttiChecker } from "./soloTuttiChecker.js";
import { sordinoChecker } from "./sordinoChecker.js";
import { tempoBarlineChecker } from "./tempoBarlineChecker.js";

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
	registeredOnce = true;
}

export {
	divisiChecker,
	firstNoteDynamicsChecker,
	openingTempoChecker,
	pizzArcoChecker,
	restAnnotationChecker,
	soloTuttiChecker,
	sordinoChecker,
	tempoBarlineChecker,
};
