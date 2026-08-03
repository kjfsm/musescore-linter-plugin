import type {
  BarLineTypeEnum,
  BracketTypeEnum,
  NoteTypeEnum,
} from "@kjfsm/musescore-plugin-sdk-types";

/**
 * QML から `buildSnapshot(curScore, { noteType: NoteType, barLineType: BarLineType }, plugin)` で
 * 渡す実行時 enum セット。値を TypeScript の定数に焼き込まず、実行中の MuseScore が提供する
 * enum を使うことでバージョン差の再採番による誤判定を防ぐ。
 */
export interface HostEnums {
  noteType: NoteTypeEnum;
  barLineType: BarLineTypeEnum;
  /**
   * 省略可。古い QML（`{ noteType, barLineType }` だけを渡す版）と新しい bundle を
   * 組み合わせても動くようにするための逃げ道で、未指定なら `meta.partGroups` が空になり
   * 括弧による絞り込みは全パート比較へフォールバックする。
   */
  bracketType?: BracketTypeEnum;
}
