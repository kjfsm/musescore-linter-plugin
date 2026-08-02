import type { BarLineTypeEnum, NoteTypeEnum } from "@kjfsm/musescore-plugin-sdk-types";

/**
 * QML から `buildSnapshot(curScore, { noteType: NoteType, barLineType: BarLineType }, plugin)` で
 * 渡す実行時 enum セット。値を TypeScript の定数に焼き込まず、実行中の MuseScore が提供する
 * enum を使うことでバージョン差の再採番による誤判定を防ぐ。
 */
export interface HostEnums {
  noteType: NoteTypeEnum;
  barLineType: BarLineTypeEnum;
}
