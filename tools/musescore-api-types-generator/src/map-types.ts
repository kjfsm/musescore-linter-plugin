export interface TypeMappingResult {
  ts: string;
  warnings: string[];
}

const PRIMITIVE_NUMBER = new Set([
  "int",
  "uint",
  "unsigned",
  "long",
  "short",
  "char",
  "qint8",
  "qint16",
  "qint32",
  "qint64",
  "quint8",
  "quint16",
  "quint32",
  "quint64",
  "qreal",
  "double",
  "float",
  "size_t",
  "qsizetype",
]);

const PRIMITIVE_BOOLEAN = new Set(["bool"]);
const PRIMITIVE_STRING = new Set(["QString", "QByteArray", "QStringRef", "QStringView"]);

const STRIP_NAMESPACES = [
  "mu::engraving::apiv1::",
  "mu::engraving::PluginAPI::",
  "mu::plugins::api::",
  "Ms::PluginAPI::",
  "PluginAPI::",
  "apiv1::",
  "engraving::",
  "Ms::",
  "mu::",
];

export function mapType(cppType: string, knownClasses: Set<string>): TypeMappingResult {
  const warnings: string[] = [];
  const ts = mapInner(cppType, knownClasses, warnings);
  return { ts, warnings };
}

function mapInner(raw: string, knownClasses: Set<string>, warnings: string[]): string {
  const cleaned = stripCvAndRefs(raw).trim();
  if (cleaned === "" || cleaned === "void") return "void";
  if (cleaned.endsWith("*")) {
    const inner = mapInner(cleaned.slice(0, -1).trim(), knownClasses, warnings);
    return inner.includes(" ") || inner.includes("|") ? `(${inner}) | null` : `${inner} | null`;
  }
  const tmpl = matchTemplate(cleaned);
  if (tmpl) {
    const { name, args } = tmpl;
    if (
      name === "QList" ||
      name === "QVector" ||
      name === "QQmlListProperty" ||
      name === "std::vector" ||
      name === "vector"
    ) {
      const inner = args[0] ? mapInner(args[0], knownClasses, warnings) : "unknown";
      const safe = inner.includes("|") ? `(${inner})` : inner;
      return `${safe}[]`;
    }
    if (name === "QMap" || name === "QHash" || name === "std::map") {
      const rawKey = args[0] ? mapInner(args[0], knownClasses, warnings) : "string";
      const key = rawKey === "string" || rawKey === "number" ? rawKey : "string";
      const v = args[1] ? mapInner(args[1], knownClasses, warnings) : "unknown";
      return `Record<${key}, ${v}>`;
    }
    warnings.push(`Unmapped template type: ${name}`);
    return "unknown";
  }
  const stripped = stripNamespaces(cleaned);
  if (PRIMITIVE_NUMBER.has(stripped)) return "number";
  if (PRIMITIVE_BOOLEAN.has(stripped)) return "boolean";
  if (PRIMITIVE_STRING.has(stripped)) return "string";
  if (stripped === "QVariant" || stripped === "QJSValue") return "unknown";
  if (stripped === "QVariantList") return "unknown[]";
  if (stripped === "QVariantMap") return "Record<string, unknown>";
  if (knownClasses.has(stripped)) return stripped;
  if (/^[A-Z]\w*$/.test(stripped)) return stripped;
  warnings.push(`Unmapped type: ${cleaned}`);
  return "unknown";
}

function stripCvAndRefs(s: string): string {
  return s
    .replace(/\bconst\b/g, "")
    .replace(/\bvolatile\b/g, "")
    .replace(/&+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNamespaces(s: string): string {
  let out = s;
  let changed = true;
  while (changed) {
    changed = false;
    for (const ns of STRIP_NAMESPACES) {
      if (out.startsWith(ns)) {
        out = out.slice(ns.length);
        changed = true;
      }
    }
  }
  return out;
}

function matchTemplate(s: string): { name: string; args: string[] } | null {
  const open = s.indexOf("<");
  if (open < 0) return null;
  if (!s.endsWith(">")) return null;
  const name = stripNamespaces(s.slice(0, open).trim());
  const inner = s.slice(open + 1, -1);
  const args: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of inner) {
    if (ch === "<") depth++;
    if (ch === ">") depth--;
    if (ch === "," && depth === 0) {
      args.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) args.push(buf.trim());
  return { name, args };
}
