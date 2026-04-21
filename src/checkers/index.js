.pragma library
.import "../checkerRegistry.js" as Registry
.import "pizzArcoChecker.js" as PizzArco
.import "sordinoChecker.js" as Sordino
.import "soloTuttiChecker.js" as SoloTutti
.import "divisiChecker.js" as Divisi
.import "restAnnotationChecker.js" as RestAnnotation
.import "tempoBarlineChecker.js" as TempoBarline
.import "openingTempoChecker.js" as OpeningTempo
.import "firstNoteDynamicsChecker.js" as FirstNoteDynamics

var registeredOnce = false;

function registerAll() {
    if (registeredOnce) return;
    Registry.reset();
    Registry.register(PizzArco.checker);
    Registry.register(Sordino.checker);
    Registry.register(SoloTutti.checker);
    Registry.register(Divisi.checker);
    Registry.register(RestAnnotation.checker);
    Registry.register(TempoBarline.checker);
    Registry.register(OpeningTempo.checker);
    Registry.register(FirstNoteDynamics.checker);
    registeredOnce = true;
}
