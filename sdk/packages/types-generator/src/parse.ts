export interface PropertyDecl {
  name: string;
  cppType: string;
  readOnly: boolean;
}

// API_PROPERTY(name, KEY) / API_PROPERTY_READ_ONLY(name, KEY) で明示的な型がない場合の
// QVariant ペイロードの既知の具体型マッピング。
// elements.h の実際の型を参照して設定する。
// 複雑な構造体型（PairF, CurveFit, GroupNodes, QPainterPath 等）は省略し QVariant のまま。
const KNOWN_VARIANT_PROP_TYPES: Readonly<Record<string, string>> = {
  // ── Fraction (apiv1 wrapper; renamed from FractionWrapper in MuseScore 4.7) ──
  timesigNominal: "Fraction*",
  timesigActual: "Fraction*",
  timesig: "Fraction*",
  timesigStretch: "Fraction*",
  lyricTicks: "Fraction*",
  spannerTick: "Fraction*",
  spannerTicks: "Fraction*",

  // ── qreal (number) ──
  tempo: "qreal",
  boxHeight: "qreal",
  boxWidth: "qreal",
  topGap: "qreal",
  bottomGap: "qreal",
  paddingToNotationAbove: "qreal",
  paddingToNotationBelow: "qreal",
  hairpinHeight: "qreal",
  hairpinContHeight: "qreal",
  userLen: "qreal",
  space: "qreal",
  lineWidth: "qreal",
  frameWidth: "qreal",
  framePadding: "qreal",
  beginHookHeight: "qreal",
  gapBetweenTextAndLine: "qreal",
  endHookHeight: "qreal",
  minDistance: "qreal",
  lineDistance: "qreal",
  staffYoffset: "qreal",
  harmonyBassScale: "qreal",
  mmRestNumberPos: "qreal",
  measureRepeatNumberPos: "qreal",
  fretFrameColumnGap: "qreal",
  fretFrameRowGap: "qreal",
  leadingSpace: "qreal",
  userStretch: "qreal",

  // ── bool ──
  hasParentheses: "bool",
  showCourtesy: "bool",
  noStem: "bool",
  barlineSpan: "bool",
  repeatStart: "bool",
  repeatEnd: "bool",
  repeatJump: "bool",
  irregular: "bool",
  breakMmr: "bool",
  staffInvisible: "bool",

  // ── int (enum 相当) ──
  subType: "int",
  hideWhenEmpty: "int",
  keysig_mode: "KeyMode",
  lineType: "LineType",
  headType: "NoteHeadType",
  headGroup: "NoteHeadGroup",
  articulationAnchor: "int",
  direction: "DirectionV",
  horizontalDirection: "DirectionH",
  stemDirection: "DirectionV",
  slurDirection: "DirectionV",
  mirrorHead: "DirectionH",
  layoutBreakType: "LayoutBreakType",
  veloChangeMethod: "ChangeMethod",
  veloChangeSpeed: "int",
  changeMethod: "ChangeMethod",
  placement: "PlacementV",
  hPlacement: "PlacementH",
  glissandoStyle: "GlissandoStyle",
  lineStyle: "LineType",
  ornamentStyle: "OrnamentStyle",
  ornamentShowCueNote: "int",
  headScheme: "NoteHeadScheme",
  subStyle: "TextStyleType",
  align: "int",
  beginTextAlign: "int",
  beginTextPlace: "TextPlace",
  beginHookType: "HookType",
  continueTextAlign: "int",
  continueTextPlace: "TextPlace",
  endTextAlign: "int",
  endTextPlace: "TextPlace",
  endHookType: "HookType",
  notelinePlacement: "NoteLineEndPlacement",
  voiceAssignment: "VoiceAssignment",
  playTechType: "PlayingTechniqueType",
  tempoChangeType: "GradualTempoChangeType",
  tempoEasingMethod: "ChangeMethod",
  tiePlacement: "TiePlacement",
  playCountTextSetting: "int",
  dotPosition: "DirectionV",
  veloType: "VeloType",
  beamMode: "BeamMode",
  combineVoice: "int",
  role: "int",
  orientation: "Orientation",
  harmonyVoicing: "int",
  harmonyDuration: "int",
  symbol: "int",
  partialSpannerDirection: "PartialSpannerDirection",
  centerBetweenStaves: "int",
  showMeasureNumbers: "int",
  fretFingering: "int",
  barlineType: "BarLineType",
  barlineSpanFrom: "int",
  barlineSpanTo: "int",
  dynamicType: "DynamicType",
  concertClefType: "ClefType",
  transposingClefType: "ClefType",
  concertKey: "Key",
  actualKey: "Key",
  repeatCount: "int",
  velocity: "int",
  userVelocity: "int",
  staffBarlineSpan: "int",
  staffBarlineSpanFrom: "int",
  staffBarlineSpanTo: "int",
  measureNumberMode: "MeasureNumberPlacement",
  noOffset: "int",
  bracketSpan: "int",
  bracketColumn: "int",
  systemBracket: "BracketType",
  numberType: "int",
  bracketType: "BracketType",
  actualNotes: "int",
  normalNotes: "int",
  staffMove: "int",

  // ── QString (string) ──
  text: "QString",
  htmlText: "QString",
  numeratorString: "QString",
  denominatorString: "QString",
  fontFace: "QString",
  beginText: "QString",
  beginFontFace: "QString",
  continueText: "QString",
  continueFontFace: "QString",
  endText: "QString",
  endFontFace: "QString",
  jumpTo: "QString",
  playUntil: "QString",
  continueAt: "QString",
  label: "QString",
  glissText: "QString",
  action: "QString",
  preset: "QString",
  scoreFont: "QString",
  playCountText: "QString",

  // ── QColor (string として emit される) ──
  lineColor: "QColor",

  // ── QPointF ({ x, y } として emit される) ──
  posAbove: "QPointF",
  mmRestNumberOffset: "QPointF",

  // ── QSizeF ({ width, height } として emit される) ──
  size: "QSizeF",
  scale: "QSizeF",
};

// Q_PROPERTY(int name READ ...) で int と宣言されているが意味的には enum であるプロパティ。
const KNOWN_Q_PROP_INT_ENUM_TYPES: Readonly<Record<string, string>> = {
  keysig: "Key",
  spannerSegmentType: "SpannerSegmentType",
};

// API_PROPERTY_T(int, name, KEY) や API_PROPERTY_READ_ONLY_T(int, name, KEY) で
// 明示的に int と宣言されているが意味的には enum であるプロパティのオーバーライドテーブル。
const KNOWN_INT_PROP_ENUM_TYPES: Readonly<Record<string, string>> = {
  accidentalBracket: "AccidentalBracket",
  accidentalType: "AccidentalType",
  ornamentShowAccidental: "OrnamentShowAccidental",
  ottavaType: "OttavaType",
  trillType: "TrillType",
  vibratoType: "VibratoType",
  hairpinType: "HairpinType",
  markerType: "MarkerType",
  glissType: "GlissandoType",
  timesigType: "TimeSigType",
  syllabic: "LyricsSyllabic",
  concertKey: "Key",
  actualKey: "Key",
  systemBracket: "BracketType",
  bracketType: "BracketType",
  mmRestRangeBracketType: "BracketType",
  measureNumberMode: "MeasureNumberPlacement",
  fontStyle: "FontStyle",
  beginFontStyle: "FontStyle",
  continueFontStyle: "FontStyle",
  endFontStyle: "FontStyle",
  arpeggioType: "ArpeggioType",
  chordLineType: "ChordLineType",
  tremoloType: "TremoloType",
  tremoloStrokeStyle: "TremoloStyle",
  inameLayoutPosition: "InstrumentLabelVisibility",
};

export interface MethodParam {
  name: string;
  cppType: string;
}

export interface MethodDecl {
  name: string;
  cppType: string;
  params: MethodParam[];
}

export interface EnumMember {
  name: string;
  value?: string;
}

export interface EnumDecl {
  name: string;
  members: EnumMember[];
}

export interface ClassDecl {
  name: string;
  baseClass: string | null;
  properties: PropertyDecl[];
  methods: MethodDecl[];
  enums: EnumDecl[];
}

export interface ParseResult {
  classes: ClassDecl[];
  enums: EnumDecl[];
}

export function parseHeader(source: string): ParseResult {
  const stripped = stripCommentsAndStrings(source);
  const classes: ClassDecl[] = [];
  const topLevelEnums: EnumDecl[] = [];

  const classRe =
    /\bclass\s+([A-Z]\w*)(?:\s*:\s*(?:public|protected|private)\s+([\w:]+(?:<[^>]+>)?)[^{]*)?\s*\{/g;
  while (true) {
    const m = classRe.exec(stripped);
    if (m === null) break;
    if (precededByEnum(stripped, m.index)) {
      classRe.lastIndex = m.index + m[0].length;
      continue;
    }
    const name = m[1] ?? "";
    const rawBase = m[2] ?? null;
    const bodyStart = m.index + m[0].length;
    const bodyEnd = findMatchingBrace(stripped, bodyStart - 1);
    if (bodyEnd < 0) continue;
    const body = stripped.slice(bodyStart, bodyEnd);
    const baseClass = rawBase ? simplifyTypeText(rawBase) : null;
    classes.push({
      name,
      baseClass,
      properties: extractQProperties(body),
      methods: extractInvokableMethods(body),
      enums: extractInlineEnums(body),
    });
    classRe.lastIndex = bodyEnd + 1;
  }

  // クラスの外側にある自立した enum（例: enums.h）
  // `(?::\s*[\w\s]+?)?` で `: unsigned char` のような複数単語の基底型にも対応する。
  const enumRe = /\benum(?:\s+class)?\s+(\w+)\s*(?::\s*[\w\s]+?)?\s*\{/g;
  while (true) {
    const m = enumRe.exec(stripped);
    if (m === null) break;
    const start = m.index;
    if (isInsideAnyClass(start, classes, stripped)) continue;
    const enName = m[1] ?? "";
    const bodyStart = m.index + m[0].length;
    const bodyEnd = findMatchingBrace(stripped, bodyStart - 1);
    if (bodyEnd < 0) continue;
    const body = stripped.slice(bodyStart, bodyEnd);
    topLevelEnums.push({ name: enName, members: parseEnumBody(body) });
  }

  return { classes, enums: topLevelEnums };
}

function isInsideAnyClass(offset: number, _classes: ClassDecl[], source: string): boolean {
  const re =
    /\bclass\s+([A-Z]\w*)(?:\s*:\s*(?:public|protected|private)\s+[\w:]+(?:<[^>]+>)?[^{]*)?\s*\{/g;
  while (true) {
    const m = re.exec(source);
    if (m === null) break;
    if (precededByEnum(source, m.index)) {
      re.lastIndex = m.index + m[0].length;
      continue;
    }
    const start = m.index;
    const bodyStart = start + m[0].length;
    const bodyEnd = findMatchingBrace(source, bodyStart - 1);
    if (bodyEnd < 0) continue;
    if (offset > bodyStart && offset < bodyEnd) return true;
    re.lastIndex = bodyEnd;
  }
  return false;
}

function precededByEnum(s: string, classKeywordIdx: number): boolean {
  let i = classKeywordIdx - 1;
  while (i >= 0 && /\s/.test(s[i] ?? "")) i--;
  if (i < 3) return false;
  return s.slice(i - 3, i + 1) === "enum";
}

function findMatchingBrace(s: string, openIdx: number): number {
  if (s[openIdx] !== "{") return -1;
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// API_PROPERTY_ENUM(enums::EnumType, name, KEY) で参照される apiv1 のエイリアス名が、
// 生成される enum 名と異なる場合の補正（例: enums::Direction は engraving の DirectionV）。
const API_PROPERTY_ENUM_ALIASES: Readonly<Record<string, string>> = {
  Direction: "DirectionV",
};

function extractQProperties(body: string): PropertyDecl[] {
  const out: PropertyDecl[] = [];

  // 標準の Q_PROPERTY(type name READ getter [WRITE setter] ...)
  for (const m of body.matchAll(/\bQ_PROPERTY\s*\(([\s\S]*?)\)/g)) {
    const inner = m[1] ?? "";
    const tokens = tokenizePropertyArgs(inner);
    if (tokens.length < 2) continue;
    const readIdx = tokens.findIndex((t) => t === "READ");
    if (readIdx < 1) continue;
    const name = tokens[readIdx - 1];
    if (!name) continue;
    const rawType = tokens
      .slice(0, readIdx - 1)
      .join(" ")
      .trim();
    if (!rawType) continue;
    const cppType = rawType === "int" ? (KNOWN_Q_PROP_INT_ENUM_TYPES[name] ?? rawType) : rawType;
    const writeIdx = tokens.indexOf("WRITE");
    out.push({ name, cppType, readOnly: writeIdx < 0 });
  }

  // API_PROPERTY_READ_ONLY_T(type, name, KEY) — _T 版を先にマッチさせる
  for (const m of body.matchAll(
    /\bAPI_PROPERTY_READ_ONLY_T\s*\(\s*([\w:*]+)\s*,\s*(\w+)\s*,\s*\w+\s*\)/g,
  )) {
    const rawType = (m[1] ?? "").trim();
    const name = (m[2] ?? "").trim();
    const cppType = rawType === "int" ? (KNOWN_INT_PROP_ENUM_TYPES[name] ?? rawType) : rawType;
    if (name && cppType) out.push({ name, cppType, readOnly: true });
  }

  // API_PROPERTY_T(type, name, KEY)
  for (const m of body.matchAll(/\bAPI_PROPERTY_T\s*\(\s*([\w:*]+)\s*,\s*(\w+)\s*,\s*\w+\s*\)/g)) {
    const rawType = (m[1] ?? "").trim();
    const name = (m[2] ?? "").trim();
    const cppType = rawType === "int" ? (KNOWN_INT_PROP_ENUM_TYPES[name] ?? rawType) : rawType;
    if (name && cppType) out.push({ name, cppType, readOnly: false });
  }

  // API_PROPERTY_READ_ONLY(name, KEY) — 型なし版は KNOWN_VARIANT_PROP_TYPES で解決
  for (const m of body.matchAll(/\bAPI_PROPERTY_READ_ONLY\s*\(\s*(\w+)\s*,\s*\w+\s*\)/g)) {
    const name = (m[1] ?? "").trim();
    if (!name) continue;
    const cppType = KNOWN_VARIANT_PROP_TYPES[name] ?? "QVariant";
    out.push({ name, cppType, readOnly: true });
  }

  // API_PROPERTY(name, KEY) — 型なし版
  for (const m of body.matchAll(/\bAPI_PROPERTY\s*\(\s*(\w+)\s*,\s*\w+\s*\)/g)) {
    const name = (m[1] ?? "").trim();
    if (!name) continue;
    const cppType = KNOWN_VARIANT_PROP_TYPES[name] ?? "QVariant";
    out.push({ name, cppType, readOnly: false });
  }

  // API_PROPERTY_ENUM(enums::EnumType, name, KEY) — 4.7+ で導入された enum プロパティマクロ。
  // 型はマクロ第 1 引数から取得する（enums:: を剥がし、必要なら別名を補正する）。
  for (const m of body.matchAll(
    /\bAPI_PROPERTY_ENUM\s*\(\s*([\w:]+)\s*,\s*(\w+)\s*,\s*\w+\s*\)/g,
  )) {
    const rawEnum = (m[1] ?? "").replace(/^.*::/, "").trim();
    const name = (m[2] ?? "").trim();
    if (!name || !rawEnum) continue;
    const cppType = API_PROPERTY_ENUM_ALIASES[rawEnum] ?? rawEnum;
    out.push({ name, cppType, readOnly: false });
  }

  // DECLARE_API_ENUM(QmlName, cppName, ns::EnumType) / DECLARE_API_ENUM2(QmlName, cppName, E1, E2)
  // — PluginAPI(MuseScore) ホストが公開する「実行時 enum オブジェクト」プロパティ。
  // 通常の enum プロパティ（値）と違い、enum 本体（メンバ集合）を指すため、emit 側で
  // RuntimeEnum<typeof Enum> として出力できるよう `@enumobj:` センチネルで型を運ぶ。
  for (const m of body.matchAll(/\bDECLARE_API_ENUM2?\s*\(\s*(\w+)\s*,\s*\w+\s*,\s*([\w:]+)/g)) {
    const name = (m[1] ?? "").trim();
    const rawEnum = (m[2] ?? "").replace(/^.*::/, "").trim();
    if (!name || !rawEnum) continue;
    const enumName = API_PROPERTY_ENUM_ALIASES[rawEnum] ?? rawEnum;
    out.push({ name, cppType: `@enumobj:${enumName}`, readOnly: true });
  }

  return out;
}

function extractInvokableMethods(body: string): MethodDecl[] {
  const out: MethodDecl[] = [];
  const marker = /\bQ_INVOKABLE\b/g;
  while (true) {
    const m = marker.exec(body);
    if (m === null) break;
    const sigStart = m.index + m[0].length;
    const end = findDeclarationEnd(body, sigStart);
    if (end < 0) continue;
    const sig = body.slice(sigStart, end).trim();
    marker.lastIndex = end + 1;
    const parsed = parseMethodSignature(sig);
    if (parsed) out.push(parsed);
  }
  return out;
}

// `from` から始まるメンバ宣言の終端のバイトインデックスを返す。
// 深さ 0 のところで最初に現れた `;` か `{`（インライン定義）のいずれか。
function findDeclarationEnd(s: string, from: number): number {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(" || ch === "<") depth++;
    else if (ch === ")" || ch === ">") depth--;
    else if (depth === 0 && (ch === ";" || ch === "{")) return i;
  }
  return -1;
}

function parseMethodSignature(sig: string): MethodDecl | null {
  const m = /^([\s\S]+?)\s+(\w+)\s*\(([\s\S]*)\)\s*(?:const)?\s*$/.exec(sig);
  if (!m) return null;
  const cppType = (m[1] ?? "").trim();
  const name = m[2] ?? "";
  const paramsRaw = (m[3] ?? "").trim();
  if (!cppType || !name) return null;
  return { name, cppType, params: parseParams(paramsRaw) };
}

function extractInlineEnums(body: string): EnumDecl[] {
  const out: EnumDecl[] = [];
  const re = /\benum(?:\s+class)?\s+(\w+)\s*(?::\s*[\w\s]+?)?\s*\{/g;
  while (true) {
    const m = re.exec(body);
    if (m === null) break;
    const name = m[1] ?? "";
    const bodyStart = m.index + m[0].length;
    const bodyEnd = findMatchingBrace(body, bodyStart - 1);
    if (bodyEnd < 0) continue;
    out.push({ name, members: parseEnumBody(body.slice(bodyStart, bodyEnd)) });
    re.lastIndex = bodyEnd;
  }
  return out;
}

function parseEnumBody(body: string): EnumMember[] {
  const out: EnumMember[] = [];
  for (const raw of body.split(",")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) {
      const name = /^[A-Za-z_]\w*/.exec(trimmed)?.[0];
      if (name) out.push({ name });
    } else {
      const name = /^[A-Za-z_]\w*/.exec(trimmed.slice(0, eq))?.[0];
      const value = trimmed.slice(eq + 1).trim();
      if (name) out.push({ name, value });
    }
  }
  return out;
}

function tokenizePropertyArgs(s: string): string[] {
  const tokens: string[] = [];
  let buf = "";
  let depth = 0;
  for (const ch of s) {
    if (ch === "<" || ch === "(") depth++;
    if (ch === ">" || ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (buf) {
        tokens.push(buf);
        buf = "";
      }
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

function parseParams(raw: string): MethodParam[] {
  if (raw === "" || raw === "void") return [];
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of raw) {
    if (ch === "<" || ch === "(") depth++;
    if (ch === ">" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());

  const out: MethodParam[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i] ?? "";
    const cleaned = p.replace(/=.+$/, "").trim();
    const tokens = cleaned.split(/\s+/);
    const last = tokens.at(-1) ?? "";
    let name = `arg${i}`;
    let cppType = cleaned;
    const idMatch = /^(\*+)?(\w+)$/.exec(last);
    if (idMatch && tokens.length > 1) {
      const ident = idMatch[2];
      if (ident && !/^(const|volatile|unsigned|signed)$/.test(ident)) {
        name = ident;
        const ptrPrefix = idMatch[1] ?? "";
        cppType = `${tokens.slice(0, -1).join(" ")}${ptrPrefix}`.trim();
      }
    }
    out.push({ name, cppType });
  }
  return out;
}

function stripCommentsAndStrings(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (ch === "/" && next === "*") {
      out += "  ";
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < source.length) {
        out += "  ";
        i += 2;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += " ";
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\" && i + 1 < source.length) {
          out += "  ";
          i += 2;
          continue;
        }
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < source.length) {
        out += " ";
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function simplifyTypeText(s: string): string {
  return s
    .replace(/^.*::/, "")
    .replace(/<[^>]*>$/, "")
    .trim();
}
