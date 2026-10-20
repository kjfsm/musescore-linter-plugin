import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emit } from "../src/emit.js";
import { parseHeader } from "../src/parse.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("parseHeader / emit", () => {
  it("parses top-level enums with multi-word base types (e.g. unsigned char)", async () => {
    const source = await readFile(join(here, "fixtures/enum-base.h"), "utf8");
    const result = parseHeader(source);

    const noteType = result.enums.find((e) => e.name === "NoteType");
    expect(noteType).toBeDefined();
    expect(noteType?.members.map((m) => m.name)).toContain("NORMAL");
    expect(noteType?.members.find((m) => m.name === "NORMAL")?.value).toBe("0");
    expect(noteType?.members.find((m) => m.name === "ACCIACCATURA")?.value).toBe("0x1");
    expect(noteType?.members.find((m) => m.name === "INVALID")?.value).toBe("0xFF");

    const playEventType = result.enums.find((e) => e.name === "PlayEventType");
    expect(playEventType).toBeDefined();
    expect(playEventType?.members.map((m) => m.name)).toEqual(["Auto", "User"]);

    const accidentalType = result.enums.find((e) => e.name === "AccidentalType");
    expect(accidentalType).toBeDefined();
    expect(accidentalType?.members.map((m) => m.name)).toEqual([
      "NONE",
      "FLAT",
      "NATURAL",
      "SHARP",
      "SHARP2",
      "FLAT2",
    ]);

    const out = emit({ perFile: [], enumOnlyFiles: [{ path: "enum-base.h", result }] });
    // 値は焼き込まず、メンバ名のユニオン + ブランド化された number 型のみを出力する。
    expect(out.enums).not.toContain("export const NoteType");
    expect(out.enums).toContain('export type NoteType = EnumValue<"NoteType">;');
    expect(out.enums).toContain("NORMAL");
    expect(out.enums).toContain("ACCIACCATURA");
    expect(out.enums).toContain("INVALID");
    expect(out.enums).not.toContain("export const PlayEventType");
    expect(out.enums).toContain('export type PlayEventType = EnumValue<"PlayEventType">;');
    expect(out.enums).toContain('"Auto"');
    expect(out.enums).toContain('"User"');
  });

  it("parses API_PROPERTY macros and resolves known QVariant types", async () => {
    const source = await readFile(join(here, "fixtures/api-property.h"), "utf8");
    const result = parseHeader(source);

    const measure = result.classes.find((c) => c.name === "Measure");
    expect(measure).toBeDefined();
    expect(measure?.baseClass).toBe("EngravingItem");

    const propNames = measure?.properties.map((p) => p.name).sort() ?? [];
    expect(propNames).toEqual(
      [
        "accidentalType",
        "actualKey",
        "irregular",
        "repeatCount",
        "timesigActual",
        "timesigNominal",
        "timesigType",
        "userStretch",
      ].sort(),
    );

    const timesigNominal = measure?.properties.find((p) => p.name === "timesigNominal");
    expect(timesigNominal?.cppType).toBe("FractionWrapper*");
    expect(timesigNominal?.readOnly).toBe(true);

    const irregular = measure?.properties.find((p) => p.name === "irregular");
    expect(irregular?.cppType).toBe("bool");
    expect(irregular?.readOnly).toBe(false);

    // API_PROPERTY without explicit type → KNOWN_VARIANT_PROP_TYPES lookup
    const repeatCount = measure?.properties.find((p) => p.name === "repeatCount");
    expect(repeatCount?.cppType).toBe("int");
    expect(repeatCount?.readOnly).toBe(false);

    // API_PROPERTY_READ_ONLY without explicit type → KNOWN_VARIANT_PROP_TYPES lookup (Key enum)
    const actualKey = measure?.properties.find((p) => p.name === "actualKey");
    expect(actualKey?.cppType).toBe("Key");
    expect(actualKey?.readOnly).toBe(true);

    const userStretch = measure?.properties.find((p) => p.name === "userStretch");
    expect(userStretch?.cppType).toBe("qreal");
    expect(userStretch?.readOnly).toBe(false);

    // API_PROPERTY_T(int, ...) → KNOWN_INT_PROP_ENUM_TYPES override
    const accidentalType = measure?.properties.find((p) => p.name === "accidentalType");
    expect(accidentalType?.cppType).toBe("AccidentalType");
    expect(accidentalType?.readOnly).toBe(false);

    // API_PROPERTY_READ_ONLY_T(int, ...) → KNOWN_INT_PROP_ENUM_TYPES override
    const timesigType = measure?.properties.find((p) => p.name === "timesigType");
    expect(timesigType?.cppType).toBe("TimeSigType");
    expect(timesigType?.readOnly).toBe(true);

    const out = emit({ perFile: [{ path: "api-property.h", result }] });
    expect(out.pluginApi).toContain("readonly timesigNominal: FractionWrapper | null;");
    expect(out.pluginApi).toContain("irregular: boolean;");
    expect(out.pluginApi).toContain("repeatCount: number;");
    expect(out.pluginApi).toContain("readonly actualKey: Key;");
    expect(out.pluginApi).toContain("userStretch: number;");
    expect(out.pluginApi).toContain("accidentalType: AccidentalType;");
    expect(out.pluginApi).toContain("readonly timesigType: TimeSigType;");
  });

  it("extracts classes, properties and Q_INVOKABLE methods from a fixture header", async () => {
    const source = await readFile(join(here, "fixtures/note.h"), "utf8");
    const result = parseHeader(source);

    const note = result.classes.find((c) => c.name === "Note");
    expect(note).toBeDefined();
    expect(note?.baseClass).toBe("EngravingItem");
    expect(note?.properties.map((p) => p.name).sort()).toEqual(["pitch", "pitchName", "tpc1"]);
    const pitch = note?.properties.find((p) => p.name === "pitch");
    expect(pitch?.readOnly).toBe(false);
    const tpc1 = note?.properties.find((p) => p.name === "tpc1");
    expect(tpc1?.readOnly).toBe(true);

    const methodNames = note?.methods.map((m) => m.name).sort();
    expect(methodNames).toEqual(["mute", "name", "nextNote"]);

    const out = emit({ perFile: [{ path: "note.h", result }] });
    expect(out.pluginApi).toContain("export interface Note extends EngravingItem");
    expect(out.pluginApi).toContain("readonly tpc1: number;");
    expect(out.pluginApi).toContain("pitch: number;");
    expect(out.pluginApi).toContain("name(): string;");
    expect(out.pluginApi).toContain("mute(muted: boolean): void;");
    expect(out.pluginApi).toContain("nextNote(): Note | null;");
  });

  it("parses API_PROPERTY_ENUM macros (4.7+) and resolves enum types", () => {
    const source = `
namespace mu::engraving::apiv1 {
class Note : public EngravingItem {
  Q_OBJECT
  API_PROPERTY_ENUM(enums::NoteHeadGroup, headGroup, HEAD_GROUP)
  API_PROPERTY_ENUM(enums::Direction, stemDirection, STEM_DIRECTION)
  API_PROPERTY_ENUM(enums::DirectionH, horizontalDirection, HORIZONTAL_DIRECTION)
};
}
`;
    const result = parseHeader(source);
    const note = result.classes.find((c) => c.name === "Note");
    expect(note).toBeDefined();

    const headGroup = note?.properties.find((p) => p.name === "headGroup");
    expect(headGroup?.cppType).toBe("NoteHeadGroup");
    expect(headGroup?.readOnly).toBe(false);

    // enums::Direction は engraving の DirectionV に補正される
    expect(note?.properties.find((p) => p.name === "stemDirection")?.cppType).toBe("DirectionV");
    expect(note?.properties.find((p) => p.name === "horizontalDirection")?.cppType).toBe(
      "DirectionH",
    );

    const out = emit({ perFile: [{ path: "note.h", result }] });
    expect(out.pluginApi).toContain("headGroup: NoteHeadGroup;");
    expect(out.pluginApi).toContain("stemDirection: DirectionV;");
  });
});
