.pragma library

"use strict";
var __bundle__ = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/bundle-entry.ts
  var bundle_entry_exports = {};
  __export(bundle_entry_exports, {
    buildSnapshot: () => buildSnapshot,
    getCheckerList: () => getCheckerList,
    runAllCheckers: () => runAllCheckers
  });

  // packages/core/src/enumRegistry.ts
  var CANONICAL = {
    elementKinds: {
      CHORD: "chord",
      REST: "rest",
      BAR_LINE: "bar_line",
      TEMPO_TEXT: "tempo_text",
      STAFF_TEXT: "staff_text",
      SYSTEM_TEXT: "system_text",
      EXPRESSION: "expression",
      REHEARSAL_MARK: "rehearsal_mark",
      DYNAMIC: "dynamic",
      UNKNOWN: "unknown"
    },
    barlineKinds: {
      DOUBLE: "double",
      OTHER: "other",
      UNKNOWN: "unknown"
    }
  };
  function buildEnumRegistry(E) {
    const enums = E != null ? E : {};
    function resolveElementKind(rawType) {
      if (rawType == null) return CANONICAL.elementKinds.UNKNOWN;
      if (enums.CHORD !== void 0 && rawType === enums.CHORD) return CANONICAL.elementKinds.CHORD;
      if (enums.REST !== void 0 && rawType === enums.REST) return CANONICAL.elementKinds.REST;
      if (enums.BAR_LINE !== void 0 && rawType === enums.BAR_LINE) return CANONICAL.elementKinds.BAR_LINE;
      if (enums.TEMPO_TEXT !== void 0 && rawType === enums.TEMPO_TEXT) return CANONICAL.elementKinds.TEMPO_TEXT;
      if (enums.STAFF_TEXT !== void 0 && rawType === enums.STAFF_TEXT) return CANONICAL.elementKinds.STAFF_TEXT;
      if (enums.SYSTEM_TEXT !== void 0 && rawType === enums.SYSTEM_TEXT) return CANONICAL.elementKinds.SYSTEM_TEXT;
      if (enums.EXPRESSION !== void 0 && rawType === enums.EXPRESSION) return CANONICAL.elementKinds.EXPRESSION;
      if (enums.REHEARSAL_MARK !== void 0 && rawType === enums.REHEARSAL_MARK) return CANONICAL.elementKinds.REHEARSAL_MARK;
      if (enums.DYNAMIC !== void 0 && rawType === enums.DYNAMIC) return CANONICAL.elementKinds.DYNAMIC;
      return CANONICAL.elementKinds.UNKNOWN;
    }
    function resolveBarlineKind(rawBarlineType) {
      if (rawBarlineType == null) return CANONICAL.barlineKinds.UNKNOWN;
      if (enums.BARLINE_DOUBLE != null) {
        if (rawBarlineType === enums.BARLINE_DOUBLE) return CANONICAL.barlineKinds.DOUBLE;
      } else if (rawBarlineType === 2) {
        return CANONICAL.barlineKinds.DOUBLE;
      }
      return CANONICAL.barlineKinds.OTHER;
    }
    return { canonical: CANONICAL, resolveElementKind, resolveBarlineKind };
  }

  // packages/core/src/issue.ts
  var SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };
  function severityRank(sev) {
    var _a;
    return (_a = SEVERITY_ORDER[sev]) != null ? _a : 99;
  }
  function createIssue(checker, fields = {}) {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
      ruleId: checker.id,
      severity: (_a = fields.severity) != null ? _a : checker.severity,
      category: checker.category,
      message: (_b = fields.message) != null ? _b : "",
      partName: (_c = fields.partName) != null ? _c : "",
      staffIdx: (_d = fields.staffIdx) != null ? _d : -1,
      measure: (_e = fields.measure) != null ? _e : 0,
      tick: (_f = fields.tick) != null ? _f : 0,
      detail: (_g = fields.detail) != null ? _g : null
    };
  }
  function compareIssues(a, b) {
    var _a, _b;
    if (a.measure !== b.measure) return a.measure - b.measure;
    if (a.staffIdx !== b.staffIdx) return a.staffIdx - b.staffIdx;
    const av = severityRank(a.severity);
    const bv = severityRank(b.severity);
    if (av !== bv) return av - bv;
    return ((_a = a.tick) != null ? _a : 0) - ((_b = b.tick) != null ? _b : 0);
  }

  // packages/core/src/checkerRegistry.ts
  var registered = [];
  var byId = {};
  function register(checker) {
    if (!(checker == null ? void 0 : checker.id)) return;
    if (byId[checker.id]) return;
    registered.push(checker);
    byId[checker.id] = checker;
  }
  function getAll() {
    return registered.slice();
  }
  function reset() {
    registered.length = 0;
    for (const key of Object.keys(byId)) delete byId[key];
  }

  // packages/core/src/logger.ts
  var LEVEL = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
  var currentLevel = LEVEL.INFO;
  function make(tag) {
    const prefix = `[ScoreLinter:${tag}]`;
    return {
      debug(msg) {
        if (currentLevel <= LEVEL.DEBUG) console.log(`${prefix} ${msg}`);
      },
      info(msg) {
        if (currentLevel <= LEVEL.INFO) console.log(`${prefix} ${msg}`);
      },
      warn(msg) {
        if (currentLevel <= LEVEL.WARN) console.warn(`${prefix} ${msg}`);
      },
      error(msg) {
        console.error(`${prefix} ${msg}`);
      }
    };
  }

  // packages/core/src/snapshot.ts
  var log = make("snapshot");
  function getPartName(score, staffIdx) {
    var _a;
    if (!score.parts) return `Staff ${staffIdx + 1}`;
    let trackOffset = 0;
    for (const part of score.parts) {
      const staveCount = part.endTrack / 4 - part.startTrack / 4;
      if (staffIdx >= trackOffset && staffIdx < trackOffset + staveCount) {
        const name = (_a = part.longName) != null ? _a : "";
        return name.length > 0 ? name : `Staff ${staffIdx + 1}`;
      }
      trackOffset += staveCount;
    }
    return `Staff ${staffIdx + 1}`;
  }
  function resolveAnnotationStaffIdx(ann) {
    if (ann.track != null && ann.track >= 0) return Math.floor(ann.track / 4);
    if (ann.staffIdx != null && ann.staffIdx >= 0) return ann.staffIdx;
    return -1;
  }
  function pushIndexedId(map, key, eventId) {
    const k = String(key);
    if (!map[k]) map[k] = [];
    map[k].push(eventId);
  }
  function normalizeText(rawText) {
    return (rawText != null ? rawText : "").replace(/<[^>]*>/g, "").toLowerCase().trim();
  }
  function appendEvent(ir, payload) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const ev = {
      id: ir.events.length,
      tick: (_a = payload.tick) != null ? _a : 0,
      measure: (_b = payload.measure) != null ? _b : 0,
      staffIdx: (_c = payload.staffIdx) != null ? _c : -1,
      voice: (_d = payload.voice) != null ? _d : -1,
      kind: payload.kind,
      type: (_e = payload.type) != null ? _e : "other",
      subtype: (_f = payload.subtype) != null ? _f : null,
      subStyle: (_g = payload.subStyle) != null ? _g : null,
      tempo: (_h = payload.tempo) != null ? _h : null,
      textNorm: (_i = payload.textNorm) != null ? _i : "",
      textRaw: (_j = payload.textRaw) != null ? _j : "",
      scope: (_k = payload.scope) != null ? _k : "staff"
    };
    if (payload.barlineType !== void 0) ev.barlineType = payload.barlineType;
    if (payload.barlineKind !== void 0) ev.barlineKind = payload.barlineKind;
    if (payload.duration !== void 0) ev.duration = payload.duration;
    ir.events.push(ev);
    pushIndexedId(ir.index.byTick, ev.tick, ev.id);
    pushIndexedId(ir.index.byKind, ev.kind, ev.id);
    pushIndexedId(ir.index.byStaff, ev.staffIdx, ev.id);
    if (!ir.index.byStaffAndKind[ev.staffIdx]) {
      ir.index.byStaffAndKind[ev.staffIdx] = {};
    }
    pushIndexedId(ir.index.byStaffAndKind[ev.staffIdx], ev.kind, ev.id);
    if (ev.tick > ir.meta.lastTick) ir.meta.lastTick = ev.tick;
    return ev;
  }
  function processAnnotations(seg, measureNum, registry, ir) {
    var _a, _b, _c;
    if (!seg.annotations) return;
    for (const ann of seg.annotations) {
      const annStaffIdx = resolveAnnotationStaffIdx(ann);
      const rawText = (_b = (_a = ann.plainText) != null ? _a : ann.text) != null ? _b : "";
      const cleanText = normalizeText(rawText);
      if (cleanText.length === 0) continue;
      const annKind = registry.resolveElementKind(ann.type);
      appendEvent(ir, {
        type: "text",
        kind: annKind,
        tick: seg.tick,
        measure: measureNum,
        staffIdx: annStaffIdx >= 0 ? annStaffIdx : -1,
        voice: -1,
        subtype: ann.subtype,
        subStyle: ann.subStyle,
        tempo: (_c = ann.tempo) != null ? _c : null,
        textNorm: cleanText,
        textRaw: rawText.replace(/<[^>]*>/g, "").trim(),
        scope: annStaffIdx >= 0 ? "staff" : "global"
      });
    }
  }
  function processStaffElements(seg, measureNum, staffIdx, registry, ir) {
    const canonical = registry.canonical;
    for (let voice = 0; voice < 4; voice++) {
      const track = staffIdx * 4 + voice;
      const el = seg.elementAt(track);
      if (!el) continue;
      const kind = registry.resolveElementKind(el.type);
      if (kind === canonical.elementKinds.CHORD || kind === canonical.elementKinds.REST) {
        const evType = kind === canonical.elementKinds.CHORD ? "chord" : "rest";
        appendEvent(ir, __spreadValues({
          type: evType,
          kind,
          tick: seg.tick,
          measure: measureNum,
          staffIdx,
          voice,
          scope: "staff"
        }, el.duration ? { duration: { numerator: el.duration.numerator, denominator: el.duration.denominator } } : {}));
        if (ir.meta.firstMusicTickByStaff[staffIdx] === null) {
          ir.meta.firstMusicTickByStaff[staffIdx] = seg.tick;
        }
      }
    }
    for (let v = 0; v < 4; v++) {
      const barEl = seg.elementAt(staffIdx * 4 + v);
      if (barEl && registry.resolveElementKind(barEl.type) === canonical.elementKinds.BAR_LINE) {
        appendEvent(ir, {
          type: "barline",
          kind: canonical.elementKinds.BAR_LINE,
          barlineType: barEl.barLineType,
          barlineKind: registry.resolveBarlineKind(barEl.barLineType),
          tick: seg.tick,
          measure: measureNum,
          staffIdx,
          voice: -1,
          scope: "staff"
        });
        break;
      }
    }
  }
  function buildSnapshot(score, E) {
    var _a, _b, _c;
    const registry = buildEnumRegistry(E);
    const numStaves = score.nstaves;
    const ir = {
      events: [],
      index: { byStaff: {}, byTick: {}, byKind: {}, byStaffAndKind: {} },
      meta: {
        parts: Array.from({ length: numStaves }, (_, i) => ({
          staffIdx: i,
          partName: getPartName(score, i)
        })),
        firstMusicTickByStaff: Array(numStaves).fill(null),
        lastTick: 0
      },
      registry: { canonical: registry.canonical },
      derived: null
    };
    let measureNum = 1;
    let m = score.firstMeasure;
    while (m) {
      try {
        let seg = m.firstSegment;
        const measureEndTick = (_c = (_b = (_a = m.nextMeasure) == null ? void 0 : _a.firstSegment) == null ? void 0 : _b.tick) != null ? _c : null;
        while (seg) {
          if (measureEndTick !== null && seg.tick >= measureEndTick) break;
          processAnnotations(seg, measureNum, registry, ir);
          for (let staffIdx = 0; staffIdx < numStaves; staffIdx++) {
            processStaffElements(seg, measureNum, staffIdx, registry, ir);
          }
          seg = seg.next;
        }
      } catch (e) {
        log.warn(`measure ${measureNum} \u306E\u89E3\u6790\u4E2D\u306B\u30A8\u30E9\u30FC: ${e}`);
      }
      measureNum++;
      m = m.nextMeasure;
    }
    log.info(
      `LintIR \u3092\u751F\u6210: events=${ir.events.length}, parts=${ir.meta.parts.length}, lastTick=${ir.meta.lastTick}`
    );
    return ir;
  }

  // packages/core/src/linter.ts
  var log2 = make("linter");
  function ensureDerived(ir) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    if (!(ir == null ? void 0 : ir.events)) return;
    if (((_a = ir.derived) == null ? void 0 : _a._eventsCount) === ir.events.length) return;
    const canonical = (_c = (_b = ir.registry) == null ? void 0 : _b.canonical) != null ? _c : CANONICAL;
    const derived = {
      _eventsCount: ir.events.length,
      firstChordByStaff: {},
      annotationIdsByTick: {},
      globalAnnotationIdsByTick: {}
    };
    const chordKind = canonical.elementKinds.CHORD;
    const chordIds = (_f = (_e = (_d = ir.index) == null ? void 0 : _d.byKind) == null ? void 0 : _e[chordKind]) != null ? _f : [];
    for (const id of chordIds) {
      const ev = ir.events[id];
      if (ev.staffIdx < 0) continue;
      const existing = derived.firstChordByStaff[ev.staffIdx];
      if (!existing || ev.tick < existing.tick || ev.tick === existing.tick && ev.measure < existing.measure) {
        derived.firstChordByStaff[ev.staffIdx] = { tick: ev.tick, measure: ev.measure };
      }
    }
    const dynamicKind = canonical.elementKinds.DYNAMIC;
    for (const tick of Object.keys((_h = (_g = ir.index) == null ? void 0 : _g.byTick) != null ? _h : {})) {
      const ids = ir.index.byTick[tick];
      const annotationIds = ids.filter((id) => {
        const e = ir.events[id];
        return e.type === "text" || e.kind === dynamicKind;
      });
      if (annotationIds.length > 0) derived.annotationIdsByTick[tick] = annotationIds;
    }
    const globalIds = (_k = (_j = (_i = ir.index) == null ? void 0 : _i.byStaff) == null ? void 0 : _j["-1"]) != null ? _k : [];
    for (const id of globalIds) {
      const gev = ir.events[id];
      const k = String(gev.tick);
      if (!derived.globalAnnotationIdsByTick[k]) derived.globalAnnotationIdsByTick[k] = [];
      derived.globalAnnotationIdsByTick[k].push(gev.id);
    }
    ir.derived = derived;
  }
  function getCheckerList() {
    return getAll();
  }
  function runAllCheckers(ir, enabledRules = {}) {
    var _a;
    ensureDerived(ir);
    const allIssues = [];
    const checkers = getAll();
    for (const checker of checkers) {
      const enabled = enabledRules[checker.id] !== void 0 ? enabledRules[checker.id] !== false : checker.defaultEnabled !== false;
      if (!enabled) continue;
      try {
        const issues = (_a = checker.run(ir)) != null ? _a : [];
        log2.info(`'${checker.id}': ${issues.length} \u4EF6\u691C\u51FA`);
        allIssues.push(...issues);
      } catch (e) {
        log2.error(`checker '${checker.id}' \u304C\u5931\u6557: ${e}`);
        allIssues.push({
          ruleId: "internal",
          severity: "error",
          category: "internal",
          message: `\u30C1\u30A7\u30C3\u30AB\u30FC '${checker.id}' \u306E\u5B9F\u884C\u4E2D\u306B\u30A8\u30E9\u30FC: ${e}`,
          partName: "",
          staffIdx: -1,
          measure: 0,
          tick: 0,
          detail: null
        });
      }
    }
    allIssues.sort(compareIssues);
    return allIssues;
  }

  // packages/checkers/src/base/predicates.ts
  function getCanonical(ir) {
    var _a, _b;
    return (_b = (_a = ir == null ? void 0 : ir.registry) == null ? void 0 : _a.canonical) != null ? _b : null;
  }
  function isKind(ev, kind) {
    return !!ev && ev.kind === kind;
  }
  function isTempoMark(ev, ir) {
    const canonical = getCanonical(ir);
    return !!(canonical && isKind(ev, canonical.elementKinds.TEMPO_TEXT));
  }
  function isDynamicMark(ev, ir) {
    const canonical = getCanonical(ir);
    if (canonical && isKind(ev, canonical.elementKinds.DYNAMIC)) return true;
    const subStyle = ((ev == null ? void 0 : ev.subStyle) ? String(ev.subStyle) : "").toLowerCase();
    return subStyle.includes("dynamic");
  }
  function matchesAny(text, patterns) {
    return patterns.includes(text);
  }
  function buildPartBuckets(ir) {
    var _a, _b, _c, _d, _e, _f;
    const canonical = getCanonical(ir);
    if (!canonical) return [];
    const textualKinds = [
      canonical.elementKinds.TEMPO_TEXT,
      canonical.elementKinds.STAFF_TEXT,
      canonical.elementKinds.SYSTEM_TEXT,
      canonical.elementKinds.EXPRESSION,
      canonical.elementKinds.REHEARSAL_MARK,
      canonical.elementKinds.DYNAMIC
    ];
    const buckets = {};
    const metaParts = (_b = (_a = ir.meta) == null ? void 0 : _a.parts) != null ? _b : [];
    for (const part of metaParts) {
      const { staffIdx } = part;
      const key = part.partName || `Staff ${staffIdx + 1}`;
      const byStaff = (_e = (_d = (_c = ir.index) == null ? void 0 : _c.byStaffAndKind) == null ? void 0 : _d[staffIdx]) != null ? _e : {};
      if (!buckets[key]) {
        buckets[key] = { partName: key, staffIdx, events: [] };
      } else if (staffIdx < buckets[key].staffIdx) {
        buckets[key].staffIdx = staffIdx;
      }
      for (const kind of textualKinds) {
        const ids = (_f = byStaff[kind]) != null ? _f : [];
        for (const id of ids) {
          const ev = ir.events[id];
          buckets[key].events.push({
            text: ev.textNorm,
            rawText: ev.textRaw,
            tick: ev.tick,
            measure: ev.measure,
            staffIdx: ev.staffIdx
          });
        }
      }
    }
    return Object.values(buckets).map((bucket) => {
      bucket.events.sort((a, b) => {
        if (a.measure !== b.measure) return a.measure - b.measure;
        if (a.tick !== b.tick) return a.tick - b.tick;
        if (a.text !== b.text) return a.text < b.text ? -1 : 1;
        return a.staffIdx - b.staffIdx;
      });
      const seen = /* @__PURE__ */ new Set();
      bucket.events = bucket.events.filter((ev) => {
        const key = `${ev.tick}|${ev.text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return bucket;
    }).sort((a, b) => a.staffIdx - b.staffIdx);
  }

  // packages/checkers/src/base/textPairChecker.ts
  function buildDuplicateIssue(checker, partName, staffIdx, ev, label, lastSwitchEvent) {
    var _a;
    const previousMeasure = (_a = lastSwitchEvent == null ? void 0 : lastSwitchEvent.measure) != null ? _a : null;
    const suffix = previousMeasure !== null ? `\uFF08\u524D\u56DE: ${previousMeasure}\u5C0F\u7BC0\u76EE\uFF09` : "";
    return createIssue(checker, {
      message: `${partName}: ${label} \u304C\u65E2\u306B\u6307\u793A\u6E08\u307F\u306E\u72B6\u614B\u3067\u518D\u5EA6\u6307\u793A\u3055\u308C\u3066\u3044\u307E\u3059\uFF08${ev.measure}\u5C0F\u7BC0\u76EE\uFF09${suffix}`,
      partName,
      staffIdx,
      measure: ev.measure,
      tick: ev.tick,
      detail: { previousMeasure }
    });
  }
  function createTextPairChecker(config) {
    var _a, _b, _c;
    const checker = {
      id: config.id,
      name: config.name,
      description: (_a = config.description) != null ? _a : "",
      category: (_b = config.category) != null ? _b : "articulation",
      severity: (_c = config.severity) != null ? _c : "warning",
      defaultEnabled: config.defaultEnabled !== false,
      run(ir) {
        const issues = [];
        const parts = buildPartBuckets(ir);
        for (const part of parts) {
          let state = config.defaultState;
          let lastSwitchEvent = null;
          for (const ev of part.events) {
            if (matchesAny(ev.text, config.onPatterns)) {
              if (state === "on") {
                issues.push(buildDuplicateIssue(checker, part.partName, part.staffIdx, ev, config.onLabel, lastSwitchEvent));
              }
              state = "on";
              lastSwitchEvent = ev;
            } else if (matchesAny(ev.text, config.offPatterns)) {
              if (state === "off") {
                issues.push(buildDuplicateIssue(checker, part.partName, part.staffIdx, ev, config.offLabel, lastSwitchEvent));
              }
              state = "off";
              lastSwitchEvent = ev;
            }
          }
          if (state === "on" && lastSwitchEvent) {
            issues.push(
              createIssue(checker, {
                message: `${part.partName}: ${config.onLabel} \u306E\u307E\u307E\u66F2\u304C\u7D42\u4E86\u3057\u3066\u3044\u307E\u3059\uFF08${config.offLabel} \u304C\u5FC5\u8981\u304B\u3082\u3057\u308C\u307E\u305B\u3093\uFF09`,
                partName: part.partName,
                staffIdx: part.staffIdx,
                measure: lastSwitchEvent.measure,
                tick: lastSwitchEvent.tick
              })
            );
          }
        }
        return issues;
      }
    };
    return checker;
  }

  // packages/checkers/src/pizzArcoChecker.ts
  var pizzArcoChecker = createTextPairChecker({
    id: "pizz-arco",
    name: "Pizz / Arco",
    description: "\u30D4\u30C1\u30AB\u30FC\u30C8\u958B\u59CB(pizz.)\u2192\u89E3\u9664(arco)\u306E\u9806\u5E8F\u3092\u78BA\u8A8D\u3002\u9023\u7D9A\u6307\u793A\u3084\u3001pizz.\u306A\u3057\u306Earco\u3092\u691C\u77E5",
    category: "articulation",
    severity: "warning",
    defaultEnabled: true,
    onPatterns: ["pizz.", "pizz", "pizzicato"],
    offPatterns: ["arco"],
    defaultState: "off",
    onLabel: "pizz.",
    offLabel: "arco"
  });

  // packages/checkers/src/sordinoChecker.ts
  var sordinoChecker = createTextPairChecker({
    id: "sordino",
    name: "Con sord. / Senza sord.",
    description: "\u5F31\u97F3\u5668\u306E\u958B\u59CB(con sord.)\u2192\u89E3\u9664(senza sord.)\u306E\u5BFE\u5FDC\u6F0F\u308C\u3084\u91CD\u8907\u3092\u691C\u77E5",
    category: "articulation",
    severity: "warning",
    defaultEnabled: true,
    onPatterns: ["con sord.", "con sord", "con sordino"],
    offPatterns: ["senza sord.", "senza sord", "senza sordino"],
    defaultState: "off",
    onLabel: "con sord.",
    offLabel: "senza sord."
  });

  // packages/checkers/src/soloTuttiChecker.ts
  var soloTuttiChecker = createTextPairChecker({
    id: "solo-tutti",
    name: "Solo / Tutti",
    description: "solo/soli \u3068 tutti \u306E\u5BFE\u5FDC\u95A2\u4FC2\u3092\u78BA\u8A8D\u3057\u3001\u91CD\u8907\u3084\u623B\u3057\u5FD8\u308C\u3092\u691C\u77E5",
    category: "articulation",
    severity: "warning",
    defaultEnabled: true,
    onPatterns: ["solo", "soli"],
    offPatterns: ["tutti"],
    defaultState: "off",
    onLabel: "solo",
    offLabel: "tutti"
  });

  // packages/checkers/src/divisiChecker.ts
  var divisiChecker = createTextPairChecker({
    id: "div-unis",
    name: "Div. / Unis.",
    description: "div. \u3068 unis. \u306E\u5BFE\u5FDC\u95A2\u4FC2\u3092\u78BA\u8A8D\u3057\u3001\u91CD\u8907\u3084\u623B\u3057\u5FD8\u308C\u3092\u691C\u77E5",
    category: "articulation",
    severity: "warning",
    defaultEnabled: true,
    onPatterns: ["div.", "div", "divisi"],
    offPatterns: ["unis.", "unis", "unisono"],
    defaultState: "off",
    onLabel: "div.",
    offLabel: "unis."
  });

  // packages/checkers/src/restAnnotationChecker.ts
  var restAnnotationChecker = {
    id: "rest-annotation",
    name: "\u4F11\u7B26\u30A2\u30CE\u30C6\u30FC\u30B7\u30E7\u30F3",
    description: "\u4F11\u7B26\u4F4D\u7F6E\u306E\u6CE8\u8A18\u3092\u78BA\u8A8D\uFF08\u5F37\u5F31\u8A18\u53F7\u30FBpizz\u30FBarco \u306A\u3069\u306F\u4E0D\u53D7\u7406\u3001\u305D\u306E\u4ED6\u30C6\u30AD\u30B9\u30C8\u306F\u53D7\u7406\uFF09",
    category: "notation",
    severity: "error",
    defaultEnabled: true,
    run(ir) {
      var _a, _b, _c, _d, _e;
      const issues = [];
      const canonical = getCanonical(ir);
      if (!canonical) return issues;
      const parts = (_b = (_a = ir.meta) == null ? void 0 : _a.parts) != null ? _b : [];
      const annotationKinds = [
        canonical.elementKinds.STAFF_TEXT,
        canonical.elementKinds.SYSTEM_TEXT,
        canonical.elementKinds.EXPRESSION,
        canonical.elementKinds.REHEARSAL_MARK,
        canonical.elementKinds.DYNAMIC
      ];
      for (const staff of parts) {
        const byStaff = (_c = ir.index.byStaffAndKind[staff.staffIdx]) != null ? _c : {};
        const restTicks = new Set(
          ((_d = byStaff[canonical.elementKinds.REST]) != null ? _d : []).map((id) => ir.events[id].tick)
        );
        for (const kind of annotationKinds) {
          const ids = (_e = byStaff[kind]) != null ? _e : [];
          for (const id of ids) {
            const ev = ir.events[id];
            if (!restTicks.has(ev.tick)) continue;
            if (!isDynamicMark(ev, ir)) continue;
            issues.push(
              createIssue(restAnnotationChecker, {
                message: `${staff.partName}: \u4F11\u7B26\u306B\u4E0D\u53D7\u7406\u306E\u6CE8\u8A18 "${ev.textRaw}" \u304C\u4ED8\u4E0E\u3055\u308C\u3066\u3044\u307E\u3059\uFF08${ev.measure}\u5C0F\u7BC0\u76EE\uFF09`,
                partName: staff.partName,
                staffIdx: staff.staffIdx,
                measure: ev.measure,
                tick: ev.tick
              })
            );
          }
        }
      }
      return issues;
    }
  };

  // packages/checkers/src/tempoBarlineChecker.ts
  var tempoBarlineChecker = {
    id: "tempo-barline",
    name: "\u30C6\u30F3\u30DD\u5909\u66F4\u3068\u8907\u7E26\u7DDA",
    description: "\u30C6\u30F3\u30DD\u5909\u66F4\u524D\u306E\u5C0F\u7BC0\u306B\u8907\u7E26\u7DDA\u304C\u3042\u308B\u304B\u3092\u78BA\u8A8D",
    category: "tempo",
    severity: "info",
    defaultEnabled: true,
    run(ir) {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const issues = [];
      if (!((_b = (_a = ir.meta) == null ? void 0 : _a.parts) == null ? void 0 : _b.length)) return issues;
      const canonical = getCanonical(ir);
      if (!canonical) return issues;
      const staff = ir.meta.parts[0];
      const byStaff = (_c = ir.index.byStaffAndKind[staff.staffIdx]) != null ? _c : {};
      const tempoIds = (_d = byStaff[canonical.elementKinds.TEMPO_TEXT]) != null ? _d : [];
      const barlineIds = (_e = byStaff[canonical.elementKinds.BAR_LINE]) != null ? _e : [];
      const barlines = {};
      const barlineEvents = [];
      for (const id of barlineIds) {
        const ev = ir.events[id];
        barlines[ev.measure] = (_f = ev.barlineKind) != null ? _f : "";
        barlineEvents.push(ev);
      }
      let tempoEvents = tempoIds.map((id) => ir.events[id]);
      tempoEvents.sort((a, b) => a.tick !== b.tick ? a.tick - b.tick : a.measure - b.measure);
      barlineEvents.sort((a, b) => a.tick !== b.tick ? a.tick - b.tick : a.measure - b.measure);
      const seen = /* @__PURE__ */ new Set();
      tempoEvents = tempoEvents.filter((ev) => {
        if (seen.has(ev.tick)) return false;
        seen.add(ev.tick);
        return true;
      });
      const firstTempoTick = (_h = (_g = tempoEvents[0]) == null ? void 0 : _g.tick) != null ? _h : null;
      let prevTempoValue = null;
      let barlineCursor = -1;
      for (const tm of tempoEvents) {
        if (tm.tick === firstTempoTick) {
          prevTempoValue = tm.tempo;
          continue;
        }
        if (prevTempoValue !== null && tm.tempo !== null && tm.tempo === prevTempoValue) continue;
        prevTempoValue = tm.tempo;
        while (barlineCursor + 1 < barlineEvents.length && barlineEvents[barlineCursor + 1].tick < tm.tick) {
          barlineCursor++;
        }
        const prevBarlineByTick = barlineCursor >= 0 ? barlineEvents[barlineCursor] : null;
        const prevMeasure = tm.measure - 1;
        const hasDoubleByMeasure = barlines[prevMeasure] === canonical.barlineKinds.DOUBLE;
        const hasDoubleByTick = (prevBarlineByTick == null ? void 0 : prevBarlineByTick.barlineKind) === canonical.barlineKinds.DOUBLE;
        if (!hasDoubleByMeasure && !hasDoubleByTick) {
          issues.push(
            createIssue(tempoBarlineChecker, {
              message: `\u30C6\u30F3\u30DD\u5909\u66F4\uFF08${tm.textRaw}\uFF09\u306E\u524D\u306E\u5C0F\u7BC0\uFF08${prevMeasure}\u5C0F\u7BC0\u76EE\uFF09\u306B\u8907\u7E26\u7DDA\u304C\u3042\u308A\u307E\u305B\u3093`,
              partName: staff.partName,
              staffIdx: 0,
              measure: prevMeasure,
              tick: tm.tick
            })
          );
        }
      }
      return issues;
    }
  };

  // packages/checkers/src/openingTempoChecker.ts
  var openingTempoChecker = {
    id: "opening-tempo",
    name: "\u5192\u982D\u30C6\u30F3\u30DD\u8868\u8A18",
    description: "\u66F2\u982D\u306B\u30C6\u30F3\u30DD\u8868\u8A18\u304C\u3042\u308B\u304B\u3092\u78BA\u8A8D\uFF08\u672A\u8A18\u8F09\u306F\u4E0D\u53D7\u7406\uFF09",
    category: "tempo",
    severity: "error",
    defaultEnabled: true,
    run(ir) {
      var _a, _b, _c, _d, _e, _f, _g;
      const issues = [];
      if (!((_b = (_a = ir.meta) == null ? void 0 : _a.parts) == null ? void 0 : _b.length)) return issues;
      const canonical = getCanonical(ir);
      if (!canonical) return issues;
      const staff = ir.meta.parts[0];
      const byStaff = (_c = ir.index.byStaffAndKind[staff.staffIdx]) != null ? _c : {};
      const chordIds = (_d = byStaff[canonical.elementKinds.CHORD]) != null ? _d : [];
      const restIds = (_e = byStaff[canonical.elementKinds.REST]) != null ? _e : [];
      let firstMusicEvent = [...chordIds, ...restIds].map((id) => ir.events[id]).reduce((best, ev) => {
        if (!best) return ev;
        if (ev.tick < best.tick) return ev;
        if (ev.tick === best.tick && ev.measure < best.measure) return ev;
        return best;
      }, null);
      if (!firstMusicEvent) return issues;
      const tempoIds = (_f = byStaff[canonical.elementKinds.TEMPO_TEXT]) != null ? _f : [];
      for (const id of tempoIds) {
        if (ir.events[id].tick <= firstMusicEvent.tick) return issues;
      }
      const globalIds = (_g = ir.index.byStaff["-1"]) != null ? _g : [];
      for (const id of globalIds) {
        const gev = ir.events[id];
        if (!isTempoMark(gev, ir)) continue;
        if (gev.tick <= firstMusicEvent.tick) return issues;
      }
      issues.push(
        createIssue(openingTempoChecker, {
          message: "\u5192\u982D\u306B\u30C6\u30F3\u30DD\u8868\u8A18\u304C\u3042\u308A\u307E\u305B\u3093",
          partName: staff.partName,
          staffIdx: 0,
          measure: 1,
          tick: firstMusicEvent.tick
        })
      );
      return issues;
    }
  };

  // packages/checkers/src/firstNoteDynamicsChecker.ts
  var firstNoteDynamicsChecker = {
    id: "first-note-dynamics",
    name: "\u5404\u30D1\u30FC\u30C8\u5192\u982D\u30C0\u30A4\u30CA\u30DF\u30AF\u30B9",
    description: "\u5404\u30D1\u30FC\u30C8\u306E1\u97F3\u76EE\u306B\u30C0\u30A4\u30CA\u30DF\u30AF\u30B9\u304C\u4ED8\u3044\u3066\u3044\u308B\u304B\u3092\u78BA\u8A8D\uFF08\u672A\u8A18\u8F09\u306F\u4E0D\u53D7\u7406\uFF09",
    category: "dynamics",
    severity: "error",
    defaultEnabled: true,
    run(ir) {
      var _a, _b, _c, _d, _e;
      const issues = [];
      if (!((_a = ir.meta) == null ? void 0 : _a.parts)) return issues;
      const canonical = getCanonical(ir);
      if (!canonical) return issues;
      const firstChordByStaff = (_c = (_b = ir.derived) == null ? void 0 : _b.firstChordByStaff) != null ? _c : {};
      for (const staff of ir.meta.parts) {
        const firstChord = firstChordByStaff[staff.staffIdx];
        if (!firstChord) continue;
        let hasDynamics = false;
        const tickIds = (_d = ir.index.byTick[String(firstChord.tick)]) != null ? _d : [];
        for (const id of tickIds) {
          const tev = ir.events[id];
          if (tev.staffIdx !== staff.staffIdx) continue;
          if (isDynamicMark(tev, ir)) {
            hasDynamics = true;
            break;
          }
        }
        if (!hasDynamics) {
          const globalIds = (_e = ir.index.byStaff["-1"]) != null ? _e : [];
          for (const id of globalIds) {
            const gev = ir.events[id];
            if (gev.tick !== firstChord.tick) continue;
            if (isDynamicMark(gev, ir)) {
              hasDynamics = true;
              break;
            }
          }
        }
        if (!hasDynamics) {
          issues.push(
            createIssue(firstNoteDynamicsChecker, {
              message: `${staff.partName}: 1\u97F3\u76EE\u306B\u30C0\u30A4\u30CA\u30DF\u30AF\u30B9\u304C\u3042\u308A\u307E\u305B\u3093`,
              partName: staff.partName,
              staffIdx: staff.staffIdx,
              measure: firstChord.measure,
              tick: firstChord.tick
            })
          );
        }
      }
      return issues;
    }
  };

  // packages/checkers/src/index.ts
  var registeredOnce = false;
  function registerAll() {
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

  // src/bundle-entry.ts
  registerAll();
  return __toCommonJS(bundle_entry_exports);
})();


var buildSnapshot = __bundle__.buildSnapshot;
var runAllCheckers = __bundle__.runAllCheckers;
var getCheckerList = __bundle__.getCheckerList;
