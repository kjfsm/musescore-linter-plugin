import { mapType } from "./map-types.js";
import type { ClassDecl, EnumDecl, ParseResult } from "./parse.js";

export interface EmitInput {
  perFile: { path: string; result: ParseResult }[];
  /** enum 定義専用ヘッダ。クラス定義は無視してトップレベル enum と class-inline enum のみ収集する。 */
  enumOnlyFiles?: { path: string; result: ParseResult }[];
}

export interface EmitOutput {
  pluginApi: string;
  enums: string;
  warnings: string[];
}

const HEADER = `// @kjfsm/musescore-plugin-sdk-types-generator が自動生成したファイル。手で編集しないこと。
// 再生成するにはリポジトリのルートで \`pnpm generate:types\` を実行する。
`;

// Plugin API には含まれないが、プロパティやメソッドの型として登場する Qt のジオメトリ型。
const QT_TYPE_ALIASES: Record<string, string> = {
  QPointF: "{ x: number; y: number }",
  QPoint: "{ x: number; y: number }",
  QRectF: "{ x: number; y: number; width: number; height: number }",
  QRect: "{ x: number; y: number; width: number; height: number }",
  QSizeF: "{ width: number; height: number }",
  QSize: "{ width: number; height: number }",
  QColor: "string",
  QDate: "string",
  QTime: "string",
  QDateTime: "string",
  QUrl: "string",
};

const BUILTIN_TS_TYPES = new Set(["number", "boolean", "string", "void", "unknown", "null"]);

// C++ クラス名 → 生成インターフェイス名のリネーム。
// PluginAPI は QML には "MuseScore" 型として登録されるため、ホスト型もその名前で出す。
const CLASS_NAME_REMAP: Record<string, string> = { PluginAPI: "MuseScore" };

// DECLARE_API_ENUM 由来のプロパティ（実行時 enum オブジェクト）を運ぶセンチネル接頭辞。
const ENUM_OBJECT_PREFIX = "@enumobj:";

export function emit(input: EmitInput): EmitOutput {
  const allClasses: ClassDecl[] = [];
  const allEnums: EnumDecl[] = [];
  const warnings: string[] = [];

  for (const f of input.perFile) {
    for (const cls of f.result.classes) allClasses.push(cls);
    for (const en of f.result.enums) allEnums.push(en);
    for (const cls of f.result.classes) {
      for (const en of cls.enums) allEnums.push(en);
    }
  }

  // enumOnlyFiles: クラス定義は捨て、enum 定義だけを収集する。
  for (const f of input.enumOnlyFiles ?? []) {
    for (const en of f.result.enums) allEnums.push(en);
    for (const cls of f.result.classes) {
      for (const en of cls.enums) allEnums.push(en);
    }
  }

  const dedupedClasses = dedupeClasses(allClasses);
  const dedupedEnums = dedupeEnums(allEnums);
  const knownClasses = new Set(dedupedClasses.map((c) => c.name));
  const knownEnumNames = new Set(
    dedupedEnums.filter((e) => e.members.length > 0).map((e) => e.name),
  );
  const referencedTypes = new Set<string>();

  const inheritedMembers = computeInheritedMembers(dedupedClasses);

  const pluginApiLines: string[] = [];
  pluginApiLines.push(HEADER);
  pluginApiLines.push("");
  if (dedupedEnums.length > 0) {
    pluginApiLines.push(
      `import type { ${[...knownEnumNames].sort().join(", ")} } from "./enums.js";`,
    );
    pluginApiLines.push("");
  }

  // DECLARE_API_ENUM 由来のホストプロパティを持つクラスがあれば、実行時 enum オブジェクトを
  // 表す RuntimeEnum ヘルパを出力する（値はビルド時に焼き込まず number、キーは生成 enum 由来）。
  const usesEnumObject = dedupedClasses.some((c) =>
    c.properties.some(
      (p) =>
        p.cppType.startsWith(ENUM_OBJECT_PREFIX) &&
        knownEnumNames.has(p.cppType.slice(ENUM_OBJECT_PREFIX.length)),
    ),
  );
  if (usesEnumObject) {
    pluginApiLines.push(
      "type RuntimeEnum<Name extends string, Value> = { readonly [K in Name]: Value };",
    );
    pluginApiLines.push("");
  }

  for (const cls of dedupedClasses) {
    const ownMethodNames = new Set(cls.methods.map((m) => m.name));
    const inheritedProps = inheritedMembers.get(cls.name)?.properties ?? new Set<string>();
    const conflictingProps = [...ownMethodNames].filter((n) => inheritedProps.has(n));

    let extendsClause = "";
    if (cls.baseClass && knownClasses.has(cls.baseClass)) {
      if (conflictingProps.length > 0) {
        const omits = conflictingProps.map((n) => `"${n}"`).join(" | ");
        extendsClause = ` extends Omit<${cls.baseClass}, ${omits}>`;
      } else {
        extendsClause = ` extends ${cls.baseClass}`;
      }
    }

    const ifaceName = CLASS_NAME_REMAP[cls.name] ?? cls.name;
    pluginApiLines.push(`export interface ${ifaceName}${extendsClause} {`);

    for (const prop of cls.properties) {
      // DECLARE_API_ENUM 由来: 実行時 enum オブジェクト。RuntimeEnum<typeof Enum> として出す。
      if (prop.cppType.startsWith(ENUM_OBJECT_PREFIX)) {
        const enumName = prop.cppType.slice(ENUM_OBJECT_PREFIX.length);
        if (!knownEnumNames.has(enumName)) {
          warnings.push(`${ifaceName}.${prop.name}: enum ${enumName} 未生成のためスキップしました`);
          continue;
        }
        pluginApiLines.push(
          `  readonly ${prop.name}: RuntimeEnum<import("./enums.js").${enumName}Name, import("./enums.js").${enumName}>;`,
        );
        continue;
      }
      const m = mapType(prop.cppType, knownClasses);
      collectReferenced(m.ts, referencedTypes);
      warnings.push(...m.warnings.map((w) => `${cls.name}.${prop.name}: ${w}`));
      const ro = prop.readOnly ? "readonly " : "";
      pluginApiLines.push(`  ${ro}${prop.name}: ${m.ts};`);
    }

    for (const method of cls.methods) {
      const ret = mapType(method.cppType, knownClasses);
      collectReferenced(ret.ts, referencedTypes);
      warnings.push(...ret.warnings.map((w) => `${cls.name}.${method.name}() return: ${w}`));
      const params = method.params
        .map((p, i) => {
          const t = mapType(p.cppType, knownClasses);
          collectReferenced(t.ts, referencedTypes);
          warnings.push(...t.warnings.map((w) => `${cls.name}.${method.name}() arg ${i}: ${w}`));
          const safeName = /^[A-Za-z_]\w*$/.test(p.name) ? p.name : `arg${i}`;
          return `${safeName}: ${t.ts}`;
        })
        .join(", ");
      pluginApiLines.push(`  ${method.name}(${params}): ${ret.ts};`);
    }

    pluginApiLines.push("}");
    pluginApiLines.push("");
  }

  // モデル化できなかった参照型に対する補助的な型エイリアス。
  const auxiliary: string[] = [];
  for (const ref of [...referencedTypes].sort()) {
    if (knownClasses.has(ref)) continue;
    if (knownEnumNames.has(ref)) continue;
    if (BUILTIN_TS_TYPES.has(ref)) continue;
    if (Object.hasOwn(QT_TYPE_ALIASES, ref)) {
      auxiliary.push(`export type ${ref} = ${QT_TYPE_ALIASES[ref]};`);
      continue;
    }
    // 既知のクラス・enum・Qt 型のいずれでもない参照型。apiv1 は enum を int として返すため
    // number としてモデル化するが、クラスの欠落・改名を黙って隠しうるので警告する。
    warnings.push(
      `参照型 "${ref}" が既知のクラス・enum・Qt 型に該当しないため number としてモデル化しました（クラスの欠落・改名の可能性）`,
    );
    auxiliary.push(`export type ${ref} = number;`);
  }
  if (auxiliary.length > 0) {
    pluginApiLines.push("// Plugin API から参照されているがモデル化されていない補助型。");
    pluginApiLines.push(...auxiliary);
    pluginApiLines.push("");
  }

  pluginApiLines.push(
    `export type PluginApiClassName = ${
      [...knownClasses]
        .map((n) => CLASS_NAME_REMAP[n] ?? n)
        .sort()
        .map((n) => `"${n}"`)
        .join(" | ") || "never"
    };`,
  );
  pluginApiLines.push("");

  const enumLines: string[] = [];
  enumLines.push(HEADER);
  enumLines.push("");
  enumLines.push(
    "// apiv1 の enum は int で表現されるが、MuseScore のバージョン間で並び替わりうる（例:",
  );
  enumLines.push(
    "// 4.7.2→4.7.3 の ElementType 再採番）。特定の int リテラルに固定せず、実行時にホストの",
  );
  enumLines.push(
    "// 該当プロパティ（例: `host.Element.NOTE`）から解決する前提で「型」だけを表す。",
  );
  enumLines.push("// Tag で enum 種別をブランドし、異なる enum 同士の値比較を型エラーにする。");
  enumLines.push("type EnumValue<Tag extends string> = number & { readonly __enum: Tag };");
  enumLines.push("");
  for (const en of dedupedEnums) {
    if (en.members.length === 0) continue;
    const names: string[] = [];
    for (const m of en.members) {
      if (m.value !== undefined && !Number.isFinite(Number(m.value))) {
        // 他メンバーへの参照や式（例: "BarLineType::NORMAL"）は数値として評価できないため
        // スキップする。
        continue;
      }
      names.push(m.name);
    }
    if (names.length === 0) continue;
    enumLines.push(`export type ${en.name}Name = ${names.map((n) => `"${n}"`).join(" | ")};`);
    enumLines.push(`export type ${en.name} = EnumValue<"${en.name}">;`);
    enumLines.push("");
  }

  return {
    pluginApi: pluginApiLines.join("\n"),
    enums: enumLines.join("\n"),
    warnings,
  };
}

function collectReferenced(tsType: string, into: Set<string>): void {
  for (const id of tsType.matchAll(/[A-Za-z_]\w*/g)) {
    const name = id[0];
    if (!name) continue;
    if (BUILTIN_TS_TYPES.has(name)) continue;
    if (name === "Omit" || name === "Record") continue;
    if (/^[A-Z]/.test(name)) into.add(name);
  }
}

interface InheritedSet {
  properties: Set<string>;
}

function computeInheritedMembers(classes: ClassDecl[]): Map<string, InheritedSet> {
  const byName = new Map<string, ClassDecl>();
  for (const c of classes) byName.set(c.name, c);

  const cache = new Map<string, InheritedSet>();
  function visit(name: string, stack: Set<string>): InheritedSet {
    const existing = cache.get(name);
    if (existing) return existing;
    if (stack.has(name)) return { properties: new Set() };
    const cls = byName.get(name);
    if (!cls) return { properties: new Set() };
    const result: InheritedSet = { properties: new Set() };
    if (cls.baseClass && byName.has(cls.baseClass)) {
      stack.add(name);
      const base = byName.get(cls.baseClass);
      if (base) {
        const baseInherited = visit(cls.baseClass, stack);
        for (const p of baseInherited.properties) result.properties.add(p);
        for (const p of base.properties) result.properties.add(p.name);
      }
      stack.delete(name);
    }
    cache.set(name, result);
    return result;
  }
  for (const c of classes) visit(c.name, new Set());
  return cache;
}

function dedupeClasses(classes: ClassDecl[]): ClassDecl[] {
  const seen = new Map<string, ClassDecl>();
  for (const c of classes) {
    const existing = seen.get(c.name);
    if (!existing) {
      seen.set(c.name, c);
      continue;
    }
    seen.set(c.name, mergeClass(existing, c));
  }
  return [...seen.values()];
}

function mergeClass(a: ClassDecl, b: ClassDecl): ClassDecl {
  const properties = dedupeBy([...a.properties, ...b.properties], (p) => p.name);
  const methods = dedupeBy([...a.methods, ...b.methods], (m) => `${m.name}(${m.params.length})`);
  return {
    name: a.name,
    baseClass: a.baseClass ?? b.baseClass,
    properties,
    methods,
    enums: [...a.enums, ...b.enums],
  };
}

function dedupeEnums(enums: EnumDecl[]): EnumDecl[] {
  const seen = new Map<string, EnumDecl>();
  for (const e of enums) {
    if (!seen.has(e.name)) seen.set(e.name, e);
  }
  return [...seen.values()];
}

function dedupeBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const item of arr) {
    const k = key(item);
    if (!seen.has(k)) seen.set(k, item);
  }
  return [...seen.values()];
}
