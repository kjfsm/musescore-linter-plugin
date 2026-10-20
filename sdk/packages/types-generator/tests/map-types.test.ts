import { describe, expect, it } from "vitest";
import { mapType } from "../src/map-types.js";

describe("mapType", () => {
  const known = new Set(["Note", "Score"]);

  it("maps primitives", () => {
    expect(mapType("int", known).ts).toBe("number");
    expect(mapType("qreal", known).ts).toBe("number");
    expect(mapType("bool", known).ts).toBe("boolean");
    expect(mapType("QString", known).ts).toBe("string");
    expect(mapType("void", known).ts).toBe("void");
  });

  it("maps pointers to nullable", () => {
    expect(mapType("Note*", known).ts).toBe("Note | null");
    expect(mapType("const Note*", known).ts).toBe("Note | null");
  });

  it("maps QList to arrays", () => {
    expect(mapType("QList<Note*>", known).ts).toBe("(Note | null)[]");
    expect(mapType("QList<int>", known).ts).toBe("number[]");
  });

  it("strips namespaces", () => {
    expect(mapType("mu::engraving::apiv1::Score*", known).ts).toBe("Score | null");
  });

  it("falls back to unknown with a warning", () => {
    const r = mapType("FooBarBaz<int>", known);
    expect(r.ts).toBe("unknown");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("maps QVector and QQmlListProperty to arrays", () => {
    expect(mapType("QVector<Note*>", known).ts).toBe("(Note | null)[]");
    // Segment.annotations 等で使われる QQmlListProperty<T> は T[] になる。
    expect(mapType("QQmlListProperty<EngravingItem>", known).ts).toBe("EngravingItem[]");
  });

  it("maps QMap / QHash to Record (non string/number keys collapse to string)", () => {
    expect(mapType("QMap<QString, int>", known).ts).toBe("Record<string, number>");
    expect(mapType("QHash<QString, Note*>", known).ts).toBe("Record<string, Note | null>");
    expect(mapType("QMap<SomeKey, int>", known).ts).toBe("Record<string, number>");
  });

  it("maps the QVariant family to unknown", () => {
    expect(mapType("QVariant", known).ts).toBe("unknown");
    expect(mapType("QJSValue", known).ts).toBe("unknown");
    expect(mapType("QVariantList", known).ts).toBe("unknown[]");
    expect(mapType("QVariantMap", known).ts).toBe("Record<string, unknown>");
  });

  it("passes unknown PascalCase types through as class references without warning", () => {
    // 未知でも PascalCase は class 参照として通す（定義の有無は emit 側が判定し、
    // 未定義なら警告する）。FractionWrapper→Fraction 改名の起点挙動。
    const r = mapType("Fraction*", known);
    expect(r.ts).toBe("Fraction | null");
    expect(r.warnings).toHaveLength(0);
  });
});
