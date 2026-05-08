/**
 * MuseScore 4 Plugin API 型定義
 *
 * @kjfsm/musescore-plugin-sdk-types をそのまま re-export する。
 * 外部パッケージに含まれないテキスト系プロパティのみ補完型として定義。
 */

export * from "@kjfsm/musescore-plugin-sdk-types";

import type { EngravingItem, Segment } from "@kjfsm/musescore-plugin-sdk-types";

/**
 * MuseScore テキスト系要素（StaffText / TempoText / Dynamic 等）。
 * EngravingItem に加えてテキスト・テンポ関連プロパティを持つ。
 * `Segment.annotations` の要素型として使用する。
 */
export interface TextAnnotation extends EngravingItem {
	readonly track?: number;
	readonly plainText?: string;
	readonly text?: string;
	readonly tempo?: number;
	readonly subStyle?: unknown;
}

/**
 * `Segment.elementAt()` で返される楽譜要素の拡張型。
 * BarLine の `barLineType` と Chord/Rest の `duration` を追加。
 */
export interface ScoreElement extends EngravingItem {
	readonly barLineType?: unknown;
	readonly duration?: { numerator: number; denominator: number };
}

/**
 * `Segment` の `annotations` と `elementAt` を上書きした拡張型。
 * `annotations` の要素を `TextAnnotation`、`elementAt` の戻り値を `ScoreElement` にする。
 */
export interface PluginSegment extends Omit<Segment, "annotations" | "elementAt"> {
	readonly annotations: TextAnnotation[];
	elementAt(track: number): ScoreElement | null;
}
