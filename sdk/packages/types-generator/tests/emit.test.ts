import { describe, expect, it } from "vitest";
import { emit } from "../src/emit.js";
import type { ClassDecl, ParseResult } from "../src/parse.js";

function cls(partial: Partial<ClassDecl> & { name: string }): ClassDecl {
  return {
    baseClass: null,
    properties: [],
    methods: [],
    enums: [],
    ...partial,
  };
}

function file(...classes: ClassDecl[]): { path: string; result: ParseResult } {
  return { path: "test.h", result: { classes, enums: [] } };
}

describe("emit", () => {
  it("warns when a property references an undefined class instead of silently degrading to number", () => {
    // 回帰ガード: MuseScore 4.7 で apiv1 の `FractionWrapper` が `Fraction` に改名された際、
    // 既知型テーブルが旧名を参照したまま未定義参照となり、`= number` に黙って退化して
    // ヘルパが壊れた。この経路では必ず警告が出ることを保証する。
    const out = emit({
      perFile: [
        file(
          cls({
            name: "Widget",
            properties: [{ name: "frac", cppType: "Fraction*", readOnly: false }],
          }),
        ),
      ],
    });

    expect(out.pluginApi).toContain("frac: Fraction | null;");
    expect(out.pluginApi).toContain("export type Fraction = number;");
    expect(out.warnings.some((w) => w.includes("Fraction"))).toBe(true);
  });

  it("does not fall back to number when the referenced class is defined", () => {
    const out = emit({
      perFile: [
        file(
          cls({
            name: "Widget",
            properties: [{ name: "frac", cppType: "Fraction*", readOnly: false }],
          }),
          cls({
            name: "Fraction",
            properties: [{ name: "ticks", cppType: "int", readOnly: true }],
          }),
        ),
      ],
    });

    expect(out.pluginApi).toContain("frac: Fraction | null;");
    expect(out.pluginApi).toContain("export interface Fraction {");
    expect(out.pluginApi).not.toContain("export type Fraction = number;");
    expect(out.warnings).toHaveLength(0);
  });

  it("merges properties when the same class appears in multiple files", () => {
    const out = emit({
      perFile: [
        file(
          cls({ name: "Note", properties: [{ name: "pitch", cppType: "int", readOnly: false }] }),
        ),
        file(cls({ name: "Note", properties: [{ name: "tpc", cppType: "int", readOnly: true }] })),
      ],
    });

    expect(out.pluginApi).toContain("pitch: number;");
    expect(out.pluginApi).toContain("readonly tpc: number;");
    // クラスは 1 つに統合される（重複定義されない）。
    expect(out.pluginApi.match(/export interface Note\b/g)?.length).toBe(1);
  });

  it("emits an extends clause when the base class is known", () => {
    const out = emit({
      perFile: [
        file(
          cls({
            name: "EngravingItem",
            properties: [{ name: "color", cppType: "QColor", readOnly: false }],
          }),
          cls({
            name: "Note",
            baseClass: "EngravingItem",
            properties: [{ name: "pitch", cppType: "int", readOnly: false }],
          }),
        ),
      ],
    });

    expect(out.pluginApi).toContain("export interface Note extends EngravingItem {");
  });

  it("renames PluginAPI to MuseScore and emits DECLARE_API_ENUM props as RuntimeEnum objects", () => {
    const out = emit({
      perFile: [
        {
          path: "qmlpluginapi.h",
          result: {
            classes: [
              cls({
                name: "PluginAPI",
                properties: [
                  // DECLARE_API_ENUM 由来（既知 enum）
                  { name: "Element", cppType: "@enumobj:ElementType", readOnly: true },
                  // 未生成 enum はスキップされ警告される
                  { name: "Nope", cppType: "@enumobj:NopeType", readOnly: true },
                  { name: "curScore", cppType: "Score*", readOnly: true },
                ],
              }),
              cls({ name: "Score" }),
            ],
            enums: [{ name: "ElementType", members: [{ name: "NOTE", value: "0" }] }],
          },
        },
      ],
    });

    expect(out.pluginApi).toContain("export interface MuseScore {");
    expect(out.pluginApi).not.toContain("export interface PluginAPI");
    expect(out.pluginApi).toContain(
      "type RuntimeEnum<Name extends string, Value> = { readonly [K in Name]: Value };",
    );
    expect(out.pluginApi).toContain(
      'readonly Element: RuntimeEnum<import("./enums.js").ElementTypeName, import("./enums.js").ElementType>;',
    );
    // 未生成 enum のプロパティは出力されず警告される。
    expect(out.pluginApi).not.toContain("Nope");
    expect(out.warnings.some((w) => w.includes("NopeType"))).toBe(true);
    // PluginApiClassName のユニオンもリネーム後の名前を含む。
    expect(out.pluginApi).toContain('"MuseScore"');
    expect(out.pluginApi).not.toContain('"PluginAPI"');
  });

  it("emits enums as type-only branded values, not runtime const objects", () => {
    const enumOut = emit({
      perFile: [
        {
          path: "barline.h",
          result: {
            classes: [],
            enums: [
              {
                name: "BarLineType",
                members: [
                  { name: "NORMAL", value: "0" },
                  { name: "END", value: "1" },
                ],
              },
            ],
          },
        },
      ],
    });

    // 値を持つ `export const` は出力しない — 誤って値として使うとコンパイルエラーになる。
    expect(enumOut.enums).not.toContain("export const BarLineType");
    expect(enumOut.enums).not.toContain(": 0,");
    expect(enumOut.enums).not.toContain(": 1,");
    // メンバ名はユニオン型として、値はブランド化された number 型として出力する。
    expect(enumOut.enums).toContain('export type BarLineTypeName = "NORMAL" | "END";');
    expect(enumOut.enums).toContain('export type BarLineType = EnumValue<"BarLineType">;');
    expect(enumOut.enums).toContain(
      "type EnumValue<Tag extends string> = number & { readonly __enum: Tag };",
    );
  });
});
