import { register, reset } from "@musescore-linter/core";
import { pizzArcoChecker } from "./pizzArcoChecker.js";
import { sordinoChecker } from "./sordinoChecker.js";
import { soloTuttiChecker } from "./soloTuttiChecker.js";
import { divisiChecker } from "./divisiChecker.js";
import { restAnnotationChecker } from "./restAnnotationChecker.js";
import { tempoBarlineChecker } from "./tempoBarlineChecker.js";
import { openingTempoChecker } from "./openingTempoChecker.js";
import { firstNoteDynamicsChecker } from "./firstNoteDynamicsChecker.js";

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
  pizzArcoChecker,
  sordinoChecker,
  soloTuttiChecker,
  divisiChecker,
  restAnnotationChecker,
  tempoBarlineChecker,
  openingTempoChecker,
  firstNoteDynamicsChecker,
};
